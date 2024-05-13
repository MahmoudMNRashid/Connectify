import User from "../models/user.js";
import Post from "../models/post.js";
import { createError } from "../util/helpers.js";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import { profileRoles } from "../util/roles.js";
import { whoCanComment_Profile } from "../util/configProfile.js";

export const isAllowed = async (req, res, next) => {
  const postId = req.body.postId;
  const yourId = req.userId;
  const errors = validationResult(req);

  try {
    //Check if validation failed
    !errors.isEmpty()
      ? createError(422, "Validation failed", errors.array())
      : null;

    //get post
    const post = await Post.findById(postId, {
      userId: 1,
      profile: 1,
      whoCanComment: 1,
      whoCanSee: 1,
      likes: 1,
    });
    //check if not found
    !post ? createError(404, "There are no post with this ID") : null;

    //are you owner
    const areYouOwnerPost = yourId.toString() === post.userId.toString();
    //used for delete comment when you are not owner comment we used for page and group
    req.areYouOwnerPost = areYouOwnerPost;
    //for cloudinary to know  post for who : page,profile or group
    req.ownerPost = post.profile;
    //we check path because we use this middlware for comment  and like
    if (req.path === "/profile/likePost") {
      const areyoulikedBefore = post.likes.includes(yourId);
      areyoulikedBefore
        ? createError(400, "You already liked in this post")
        : null;
    }
    //same
    if (req.path === "/profile/unlikePost") {
      const areyoulikedBefore = post.likes.includes(yourId);
      !areyoulikedBefore
        ? createError(400, "You already unliked in this post")
        : null;
    }

    //you owner immidatly go
    if (areYouOwnerPost) {
      next();
    }

    // not owner get info owner for post like friends and profiles you blocked for check can comment or like
    const owner = await User.findById(post.profile, {
      profilesYouBlocked: {
        $filter: {
          input: "$profilesYouBlocked",
          as: "user",
          cond: {
            $eq: ["$$user", new mongoose.Types.ObjectId(yourId)],
          },
        },
      },
      friends: {
        $filter: {
          input: "$friends",
          as: "user",
          cond: {
            $eq: ["$$user", new mongoose.Types.ObjectId(yourId)],
          },
        },
      },
    });

    // you blocked can not comment or like
    owner.profilesYouBlocked.length > 0 ? createError(403, "Forbidden") : null;
    //check if you are friends
    let areYouFriends;
    owner.friends.length > 0 ? (areYouFriends = true) : (areYouFriends = false);
    //this condition just for comment
    // maybe you cant comment but can like while canyousee =public and not friends
    if (
      req.path !== "/profile/likePost" &&
      req.path !== "/profile/unlikePost"
    ) {
      post.whoCanComment === whoCanComment_Profile.FRIENDS && !areYouFriends
        ? createError(403, "Forbidden")
        : null;
    }

    //for both comment and like
    post.whoCanSee === whoCanComment_Profile.FRIENDS && !areYouFriends
      ? createError(403, "Forbidden.")
      : null;

    next();
  } catch (error) {
    next(error);
  }
};

export const canSeeWithRole = async (req, res, next) => {
  const yourId = req.userId;
  const profileId = req.params.profileId || req.body.profileId;

  try {
    //get page with some info
    const profile = await User.findById(profileId, {
      friends: {
        $filter: {
          input: "$friends",
          as: "user",
          cond: {
            $eq: ["$$user", new mongoose.Types.ObjectId(yourId)],
          },
        },
      },
      _id: 1,
    });
    //check if found
    !profile ? createError(404, "There are no profile with this ID") : null;

    //from your profile you if he blocked you (this is just for backend )
    const yourProfile = await User.findOne(
      {
        _id: yourId,
      },
      {
        profilesYouBlocked: 1,
        blockedProfiles: 1,
        blockedPages: 1,
        blockedGroups: 1,
       
      }
    );

    yourProfile.profilesYouBlocked.includes(profileId)
      ? createError(403, "Forbidden")
      : null;

    yourProfile.blockedProfiles.includes(profileId)
      ? createError(403, "Forbidden")
      : null;
    //get role
    profile.friends.length > 0
      ? (req.role = profileRoles.FRIENDS)
      : profile._id.toString() === yourId.toString()
      ? (req.role = profileRoles.OWNER)
      : (req.role = profileRoles.NOT_FRIENDS);

    req.profilesYouBlocked = yourProfile.profilesYouBlocked;
    req.blockedProfiles = yourProfile.blockedProfiles;
    req.blockedPages = yourProfile.blockedPages;
    req.blockedGroups = yourProfile.blockedGroups;
 
    next();
  } catch (error) {
    next(error);
  }
};

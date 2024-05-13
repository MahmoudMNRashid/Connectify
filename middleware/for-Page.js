import { validationResult } from "express-validator";
import Page from "../models/page.js";
import User from "../models/user.js";
import Post from "../models/post.js";
import { createError } from "../util/helpers.js";
import mongoose from "mongoose";
import { pageRoles } from "../util/roles.js";
import { whoCanComment_Page, whoCanSee_Page } from "../util/configPage.js";

export const isAllowed = async (req, res, next) => {
  const postId = req.body.postId;
  const yourId = req.userId;
  const errors = validationResult(req);

  try {
    //check if validation failed
    !errors.isEmpty()
      ? createError(422, "Validation failed", errors.array())
      : null;

    //get post
    const post = await Post.findById(postId, {
      userId: 1,
      page: 1,
      whoCanComment: 1,
      whoCanSee: 1,
    });
    //check if not found
    !post ? createError(404, "There are no post with this ID") : null;

    //are you owner
    const areYouOwnerPost = yourId.toString() === post.userId.toString();
    //used for delete comment when you are not owner comment
    req.areYouOwnerPost = areYouOwnerPost;
    //for cloudinary to know  post for who : page,profile or group
    req.ownerPost = post.page;

    //we check path because we use this middlware for comment  and like
    if (req.path === "/page/likePost") {
      const areyoulikedBefore = post.likes.includes(yourId);
      areyoulikedBefore
        ? createError(400, "You already liked in this post")
        : null;
    }
    //same
    if (req.path === "/page/unlikePost") {
      const areyoulikedBefore = post.likes.includes(yourId);
      !areyoulikedBefore
        ? createError(400, "You already unliked in this post")
        : null;
    }

    //you owner immidatly go
    if (areYouOwnerPost) {
      next();
    }

    // not owner get info owner for post like likers and profiles you blocked for check can comment or like
    const owner = await Page.findById(post.page, {
      usersBlocked: {
        $filter: {
          input: "$usersBlocked",
          as: "user",
          cond: {
            $eq: ["$$user", new mongoose.Types.ObjectId(yourId)],
          },
        },
      },
      usersLiked: {
        $filter: {
          input: "$usersLiked",
          as: "user",
          cond: {
            $eq: ["$$user", new mongoose.Types.ObjectId(yourId)],
          },
        },
      },
    });

    // you blocked can not comment or like
    owner.usersBlocked.length > 0 ? createError(403, "Forbidden") : null;

    let areYouLikedInPage;
    owner.usersLiked.length > 0
      ? areYouLikedInPage === true
      : (areYouLikedInPage = false);

    //this condition just for comment
    // maybe you cant comment but can like while canyousee =public and not likers
    if (
      req.path !== "/profile/likePost" &&
      req.path !== "/profile/unlikePost"
    ) {
      post.whoCanComment === whoCanComment_Page.FOLLOWERS && !areYouLikedInPage
        ? createError(403, "Forbidden")
        : null;
    }

    //for both comment and like
    post.whoCanSee === whoCanSee_Page.FOLLOWERS && !areYouLikedInPage
      ? createError(403, "Forbidden")
      : null;

    next();
  } catch (error) {
    next(error);
  }
};
export const isOwner = async (req, res, next) => {
  const yourId = req.userId;
  const pageId = req.body.pageId;
  try {
    const page = await Page.findById(pageId, { owner: 1 });
    if (!page) {
      createError(404, "No page with this ID");
    }
    if (page.owner.toString() !== yourId.toString()) {
      createError(403, "Not Authorized");
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const canSeeWithRole = async (req, res, next) => {
  const yourId = req.userId;
  const pageId = req.params.pageId || req.body.pageId;

  try {
    //get page with some info
    const page = await Page.findById(pageId, {
      usersLiked: {
        $filter: {
          input: "$usersLiked",
          as: "user",
          cond: {
            $eq: ["$$user", new mongoose.Types.ObjectId(yourId)],
          },
        },
      },
      usersBlocked: {
        $filter: {
          input: "$usersBlocked",
          as: "user",
          cond: {
            $eq: ["$$user.userId", new mongoose.Types.ObjectId(yourId)],
          },
        },
      },
      owner: 1,
    });
    //check if found
    !page ? createError(404, "There are no page with this ID") : null;

    //check if he blocked
    page.usersBlocked.length > 0 ? createError(403, "Forbidden") : null;
    //get role
    page.owner.toString() === yourId.toString()
      ? (req.role = pageRoles.MODERATOR)
      : page.usersLiked.length > 0
      ? (req.role = pageRoles.FOLLOWERS)
      : (req.role = pageRoles.NOT_FOLLOWERS);

    //here you can make him exe this code in just some route
    //for extract people you blockd or they blocked you
    const yourProfile = await User.findOne(
      {
        _id: yourId,
      },
      {
        profilesYouBlocked: 1,
        blockedProfiles: 1,
     
       
      }
    );
    req.profilesYouBlocked = yourProfile.profilesYouBlocked;
    req.blockedProfiles = yourProfile.blockedProfiles;
    next();
  } catch (error) {
    next(error);
  }
};

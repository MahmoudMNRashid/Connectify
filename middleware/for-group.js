import Group from "../models/group.js";
import Post from "../models/post.js";
import User from "../models/user.js";
import { createError } from "../util/helpers.js";
import mongoose from "mongoose";
import { validationResult } from "express-validator";
import { groupRoles } from "../util/roles.js";
import { visibility } from "../util/configGroup.js";

//for post-->likes-->comment
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
      group: 1,
    });
    //check if not found
    !post ? createError(404, "There are no post with this ID") : null;

    //are you owner
    const areYouOwnerPost = yourId.toString() === post.userId.toString();
    //used for delete comment when you are not owner comment
    req.areYouOwnerPost = areYouOwnerPost;
    //for cloudinary to know  post for who : page,profile or group
    req.ownerPost = post.group;

    //we check path because we use this middlware for comment  and like
    if (req.path === "/group/likePost") {
      const areyoulikedBefore = post.likes.includes(yourId);
      areyoulikedBefore
        ? createError(400, "You already liked in this post")
        : null;
    }
    //same
    if (req.path === "/group/unlikePost") {
      const areyoulikedBefore = post.likes.includes(yourId);
      !areyoulikedBefore
        ? createError(400, "You already unliked in this post")
        : null;
    }
    //you owner immidatly go
    if (areYouOwnerPost) {
      next();
    }

    //post for group you should member(mam) in group to like or comment
    const group = await Group.findById(post.group, {
      members: {
        $filter: {
          input: "$members",
          as: "user",
          cond: {
            $eq: ["$$user.userId", new mongoose.Types.ObjectId(yourId)],
          },
        },
      },
      admins: {
        $filter: {
          input: "$admins",
          as: "user",
          cond: {
            $eq: ["$$user.userId", new mongoose.Types.ObjectId(yourId)],
          },
        },
      },
      moderator: 1,
    });

    group.members.length === 0 &&
    group.admins.length === 0 &&
    group.moderator.toString() !== yourId.toString()
      ? createError(403, "Forbidden")
      : null;

    //not used  بس تاكد
    group.members.length > 0
      ? req.role === groupRoles.MEMBER
      : group.admins.length > 0
      ? req.role === groupRoles.ADMIN
      : group.moderator.toString() === yourId.toString()
      ? req.role === groupRoles.MODERATOR
      : null;

    next();
  } catch (error) {
    next(error);
  }
};

//all this three functions for post-delete-patch-put
export const isModerator = async (req, res, next) => {
  const yourId = req.userId;
  const groupId = req.body.groupId;

  try {
    const group = await Group.findById(groupId, {
      moderator: 1,
    });
    if (!group) {
      createError(404, "Group not exist");
    }
    if (group.moderator.toString() !== yourId.toString()) {
      createError(403, "Not authenticated You are not moderator");
    }
    next();
  } catch (error) {
    next(error);
  }
};
export const isAdmin = async (req, res, next) => {
  const yourId = req.userId;
  const groupId = req.body.groupId;

  try {
    const group = await Group.findById(groupId, {
      admins: {
        $filter: {
          input: "$admins",
          as: "user",
          cond: {
            $eq: ["$$user.userId", new mongoose.Types.ObjectId(yourId)],
          },
        },
      },
      moderator: 1,
    });

    !group ? createError(404, "There are no group with this ID") : null;

    group.admins.length === 0 &&
    group.moderator.toString() !== yourId.toString()
      ? createError(403, "Forbidden")
      : null;

    group.admins.length > 0
      ? req.role === groupRoles.ADMIN
      : group.moderator.toString() === yourId.toString()
      ? req.role === groupRoles.MODERATOR
      : req.role === groupRoles.NOT_Member;
    next();
  } catch (error) {
    next(error);
  }
};

export const isMember = async (req, res, next) => {
  const yourId = req.userId;
  const groupId = req.body.groupId || req.params.groupId;
  try {
    const group = await Group.findById(groupId, {
      members: {
        $filter: {
          input: "$members",
          as: "user",
          cond: {
            $eq: ["$$user.userId", new mongoose.Types.ObjectId(yourId)],
          },
        },
      },
      admins: {
        $filter: {
          input: "$admins",
          as: "user",
          cond: {
            $eq: ["$$user.userId", new mongoose.Types.ObjectId(yourId)],
          },
        },
      },
      moderator: 1,
    });

    !group ? createError(404, "There are no group with this ID") : null;

    group.members.length === 0 &&
    group.admins.length === 0 &&
    group.moderator.toString() !== yourId.toString()
      ? createError(403, "Forbidden - You did not join to this group")
      : null;

    //not used  بس تاكد
    group.members.length > 0
      ? (req.role = groupRoles.MEMBER)
      : group.admins.length > 0
      ? (req.role = groupRoles.ADMIN)
      : group.moderator.toString() === yourId.toString()
      ? (req.role = groupRoles.MODERATOR)
      : (req.role = groupRoles.NOT_Member);

    next();
  } catch (error) {
    next(error);
  }
};

//for get
//1- get some info for group and for you from group
export const didJoinGroup = async (req, res, next) => {
  const yourId = req.userId;
  const groupId = req.params.groupId;
  try {
    // get group with info:are you member,blocked,send request , some info for group
    const group = await Group.findById(groupId, {
      members: {
        $filter: {
          input: "$members",
          as: "user",
          cond: {
            $eq: ["$$user.userId", new mongoose.Types.ObjectId(yourId)],
          },
        },
      },
      admins: {
        $filter: {
          input: "$admins",
          as: "user",
          cond: {
            $eq: ["$$user.userId", new mongoose.Types.ObjectId(yourId)],
          },
        },
      },
      moderator: 1,

      joiningRequests: {
        $filter: {
          input: "$joiningRequests",
          as: "user",
          cond: {
            $eq: ["$$user.userId", new mongoose.Types.ObjectId(yourId)],
          },
        },
      },
      visibility: 1,
      privacy: 1,
      whoCanApproveMemberRequest: 1,
      membersBlocked: {
        $filter: {
          input: "$membersBlocked",
          as: "member",
          cond: {
            $eq: ["$$member", new mongoose.Types.ObjectId(yourId)],
          },
        },
      },
    });

    //check if there are group
    !group ? createError(404, "There are no group with this ID") : null;

    //send role
    group.members.length > 0
      ? (req.role = groupRoles.MEMBER)
      : group.admins.length > 0
      ? (req.role = groupRoles.ADMIN)
      : group.moderator.toString() === yourId.toString()
      ? (req.role = groupRoles.MODERATOR)
      : (req.role = groupRoles.NOT_Member);

    //send visibility
    req.visibility = group.visibility;
    //send privacy
    req.privacy = group.privacy;
    //send if you blocked
    req.isHeBlocked = group.membersBlocked.length > 0 ? true : false;
    //send if you send request
    req.isHeSendRequest = group.joiningRequests.length > 0 ? true : false;

    // we send this for get members request for if member can get
    req.whoCanApproveMemberRequest = group.whoCanApproveMemberRequest;

    //get some info from your profile
    const yourProfile = await User.findOne(
      {
        _id: yourId,
      },
      {
        _id: 1,
        sentInvitesFromGroups: {
          $filter: {
            input: "$sentInvitesFromGroups",
            as: "invite",
            cond: {
              $eq: ["$$invite.groupId", new mongoose.Types.ObjectId(groupId)],
            },
          },
        },
        blockedProfiles: 1,
        profilesYouBlocked: 1,
      }
    );
    //send if you invited
    req.isHeinvited =
      yourProfile.sentInvitesFromGroups.length > 0 ? true : false;
    //this for when get comment or likes of post should not see profiles you blocked or they blocked you
    req.profilesYouBlocked = yourProfile.profilesYouBlocked;
    req.blockedProfiles = yourProfile.blockedProfiles;
    next();
  } catch (error) {
    next(error);
  }
};
export const canSee = async (req, res, next) => {
  try {
    if (req.isHeBlocked) {
      createError(403, "Forbidden.");
    }

    if (req.role !== groupRoles.NOT_Member) {
      return next();
    }

    if (
      req.visibility === visibility.HIDDEN &&
      (req.isHeinvited || req.isHeSendRequest)
    ) {
      return next();
    }

    if (req.visibility === visibility.VISIBLE) {
      return next();
    }

    createError(403, "Forbidden.");
  } catch (error) {
    next(error);
  }
};

//for cud post cud comment cud like

export const isAllow = async (req, res, next) => {
  const groupId = req.body.groupId;
  const postId = req.body.postId;
  const yourId = req.userId;
  try {
    //group should found and you in and not blocked
    //this for all

    const group = await Group.findById(groupId, {
      members: {
        $filter: {
          input: "$members",
          as: "user",
          cond: {
            $eq: ["$$user.userId", new mongoose.Types.ObjectId(yourId)],
          },
        },
      },
      admins: {
        $filter: {
          input: "$admins",
          as: "user",
          cond: {
            $eq: ["$$user.userId", new mongoose.Types.ObjectId(yourId)],
          },
        },
      },
      moderator: 1,
    });
    //maybe Id of group wrong
    !group ? createError(404, "There are no group with this ID") : null;
    //check you are member no blocked because when you blocked will not be in members,admins or moderator
    group.members.length === 0 &&
    group.admins.length === 0 &&
    group.moderator.toString() !== yourId.toString()
      ? createError(403, "Forbidden")
      : null;
    //get your roles
    group.members.length > 0
      ? req.role === groupRoles.MEMBER
      : group.admins.length > 0
      ? req.role === groupRoles.ADMIN
      : group.moderator.toString() === yourId.toString()
      ? req.role === groupRoles.MODERATOR
      : null;
  } catch (error) {
    next();
  }
};

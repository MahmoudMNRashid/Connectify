import jwt from "jsonwebtoken";
import { privateKey } from "../util/auth.js";
import Group from "../models/group.js";
import mongoose from "mongoose";
import User from "../models/user.js";

export const isAuth = (req, res, next) => {
  const authHeader = req.get("Authorization");

  if (!authHeader) {
    const error = new Error("Not auth");
    error.statusCode = 401;
    throw error;
  }

  const token = authHeader.split(" ")[1];

  let decodedtoken;
  try {
    decodedtoken = jwt.verify(token, process.env.PRIVATE_KEY);
    if (!decodedtoken) {
      const error = new Error("not authenticated");
      error.statusCode = 401;
      throw error;
    }
    req.userId = decodedtoken.userId;
    req.email = decodedtoken.email;
    req.role = decodedtoken.role;
    next();
  } catch (error) {
    error.statusCode = 500;
    next(error);
  }
};

export const isModerator = async (req, res, next) => {
  const userId = req.userId;
  const groupId = req.body.groupId;

  try {
    const user = await User.findById(userId, { _id: 1,groups:1,postsFromGroup:1,firstName:1,lastName:1,joiningRequestsToGroups:1,friends:1 });
    if (!user) {
      const error = new Error("Not auth");
      error.statusCode = 401;
      throw error;
    }

    const group = await Group.findById(groupId, {
      moderator: 1,
    });
    if (!group) {
      const error = new Error("group not exist ");
      error.statusCode = 404;
      throw error;
    }

    if (group.moderator.toString() !== userId) {
      const error = new Error("Not authenticated You are not moderator");
      error.statusCode = 403;
      throw error;
    }
    req.user=user


    next();
  } catch (error) {
    next(error);
  }
};
export const isAdmin = async (req, res, next) => {
  const userId = req.userId;
  const groupId = req.body.groupId;

  try {
    const user = await User.findById(userId, { _id: 1,groups:1,postsFromGroup:1,firstName:1,lastName:1,joiningRequestsToGroups:1,friends:1 });

    if (!user) {
      const error = new Error("Not auth");
      error.statusCode = 401;
      throw error;
    }
    const group = await Group.findById(groupId, {
      moderator: 1,
      admins: 1,
    });
    if (!group) {
      const error = new Error("group not exist ");
      error.statusCode = 404;
      throw error;
    }

    const isUserModerator =
      group.moderator.toString() === userId ? true : false;
    const isUserAdmin = group.admins.includes(
      new mongoose.Types.ObjectId(userId)
    );
    console.log(isUserAdmin, isUserModerator);

    if (!isUserModerator && !isUserAdmin) {
      const error = new Error(
        "Not authenticated you are not admins or moderator"
      );
      error.statusCode = 403;
      throw error;
    }

    if (isUserAdmin) {
      req.type = "admin";
    } else {
      req.type = "moderator";
    }
    req.user = user;
  

    next();
  } catch (error) {
    next(error);
  }
};
export const isMember = async (req, res, next) => {
  const userId = req.userId;
  const groupId = req.body.groupId;

  try {
    const user = await User.findById(userId, { _id: 1,groups:1,postsFromGroup:1,firstName:1,lastName:1,joiningRequestsToGroups:1,friends:1 });

    if (!user) {
      const error = new Error("Not auth");
      error.statusCode = 401;
      throw error;
    }
    const group = await Group.findById(groupId, {
      moderator: 1,
      admins: 1,
      members: 1,
    });
    if (!group) {
      const error = new Error("group not exist ");
      error.statusCode = 404;
      throw error;
    }

    const isUserModerator =
      group.moderator.toString() === userId ? true : false;
    const isUserAdmin = group.admins.includes(
      new mongoose.Types.ObjectId(userId)
    );
    console.log(isUserAdmin, isUserModerator);

    const isUserMember = group.admins.includes(
      new mongoose.Types.ObjectId(userId)
    );

    if (!isUserModerator && !isUserAdmin && !isUserMember) {
      const error = new Error(
        "Not authenticated you are not members or  admins or moderator "
      );
      error.statusCode = 403;
      throw error;
    }
    if (isUserMember) {
      req.type = "member";
    } else if (isUserAdmin) {
      req.type = "admin";
    } else {
      req.type = "moderator";
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

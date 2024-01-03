import { validationResult } from "express-validator";
import User from "../models/user.js";
import Group from "../models/group.js";
import { host } from "../util/connect.js";

import {
  deleteAssets,
  fileFilterPhotosAndVideos,
  uploadAssets,
} from "../util/file.js";
import mongoose from "mongoose";
import Post from "../models/post.js";

export const createGroup = async (req, res, next) => {
  const errors = validationResult(req);
  const userId = req.userId;
  const name = req.body.name;
  const privacy = req.body.privacy;
  const visibility = req.body.visibility;
  console.log(visibility);
  const role = "moderator";
  try {
    const user = await User.findById(userId, { groups: 1 });

    if (!errors.isEmpty()) {
      const error = new Error("Validation  failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    const group = new Group({ name, privacy, visibility, moderator: user._id });
    const result = await group.save();
    result.link = host + "/group" + "/" + result._id.toString();
    await result.save();
    user.groups.push({ groupId: result._id, role });
    await user.save();
    res
      .status(201)
      .json({ message: "Your group was created", groupId: result._id });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const addCoverPhoto = async (req, res, next) => {
  const userId = req.userId;
  const coverPhoto = req.files;
  const groupId = req.body.groupId;

  try {
    const group = await Group.findById(groupId, {
      coverPhoto: 1,
      moderator: 1,
      admins: 1,
    });

    if (group.coverPhoto) {
      const error = new Error("There are photo already");
      error.statusCode = 400;
      throw error;
    }

    if (coverPhoto.length !== 1) {
      const error = new Error("Please upload one photo ");
      error.statusCode = 422;
      throw error;
    }
    const allowedImageTypes = ["image/png", "image/jpg", "image/jpeg"];
    if (!allowedImageTypes.includes(coverPhoto[0].mimetype)) {
      const error = new Error("Photo must be png,jpj or jpeg ");
      error.statusCode = 422;
      throw error;
    }

    const publicidAndLink = await uploadAssets(
      coverPhoto,
      1,
      "Assets from group"
    );
    group.coverPhoto = publicidAndLink[0];
    await group.save();
    res
      .status(200)
      .json({ message: "Cover photo was added ", link: publicidAndLink });
  } catch (error) {
    next(error);
  }
};
export const updateCoverPhoto = async (req, res, next) => {
  const userId = req.userId;
  const coverPhoto = req.files;
  const groupId = req.body.groupId;

  try {
    const group = await Group.findById(groupId, {
      coverPhoto: 1,
      moderator: 1,
      admins: 1,
    });

    if (!group.coverPhoto) {
      const error = new Error("Please add photo before ");
      error.statusCode = 400;
      throw error;
    }

    if (coverPhoto.length !== 1) {
      const error = new Error("Please upload one photo ");
      error.statusCode = 422;
      throw error;
    }
    const allowedImageTypes = ["image/png", "image/jpg", "image/jpeg"];
    if (!allowedImageTypes.includes(coverPhoto[0].mimetype)) {
      const error = new Error("Photo must be png,jpj or jpeg ");
      error.statusCode = 422;
      throw error;
    }
    console.log([group.coverPhoto]);
    await deleteAssets([group.coverPhoto]);
    const publicidAndLink = await uploadAssets(
      coverPhoto,
      1,
      "Assets from group"
    );
    group.coverPhoto = publicidAndLink[0];
    await group.save();
    res
      .status(200)
      .json({ message: "Cover photo was updated ", link: publicidAndLink });
  } catch (error) {
    next(error);
  }
};

export const addDescription = async (req, res, next) => {
  const errors = validationResult(req);
  const userId = req.userId;
  const description = req.body.description;
  const groupId = req.body.groupId;

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Description should not be empty");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const group = await Group.findById(groupId, {
      description: 1,
      moderator: 1,
      admins: 1,
    });

    if (group.description) {
      const error = new Error("There are description already");
      error.statusCode = 400;
      throw error;
    }

    group.description = description;
    await group.save();
    res.status(200).json({ message: "Description was added " });
  } catch (error) {
    next(error);
  }
};
export const updateDescription = async (req, res, next) => {
  const errors = validationResult(req);
  const userId = req.userId;
  const description = req.body.description;
  const groupId = req.body.groupId;

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Description should not be empty");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const group = await Group.findById(groupId, {
      description: 1,
      moderator: 1,
      admins: 1,
    });

    if (!group.description) {
      const error = new Error("No description found");
      error.statusCode = 400;
      throw error;
    }

    group.description = description;
    await group.save();
    res.status(200).json({ message: "Description was updated " });
  } catch (error) {
    next(error);
  }
};

export const updateName = async (req, res, next) => {
  const errors = validationResult(req);
  const userId = req.userId;
  const name = req.body.name;
  const groupId = req.body.groupId;

  try {
    if (!errors.isEmpty()) {
      const error = new Error("name should not be empty");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const group = await Group.findById(groupId, {
      name: 1,
      moderator: 1,
      admins: 1,
    });

    group.name = name;
    await group.save();
    res.status(200).json({ message: "name was updated " });
  } catch (error) {
    next(error);
  }
};

export const changeVisibility = async (req, res, next) => {
  const errors = validationResult(req);
  const userId = req.userId;
  const groupId = req.body.groupId;
  const visibility = req.body.visibility;

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Invalid Validation in Visibility");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const group = await Group.findById(groupId, {
      name: 1,
      moderator: 1,
      admins: 1,
      privacy: 1,
      visibility: 1,
    });

    if (visibility === "hidden" && group.privacy === "public") {
      const error = new Error(
        "You Can not change visibility to hidden because the privacy is public"
      );
      error.statusCode = 403;
      throw error;
    }

    if (visibility === "hidden" && group.visibility === "hidden") {
      const error = new Error(
        "You Can not change visibility to hidden because already is hidden"
      );
      error.statusCode = 403;
      throw error;
    }
    if (visibility === "visible" && group.visibility === "visible") {
      const error = new Error(
        "You Can not change visibility to visible because already is visible"
      );
      error.statusCode = 403;
      throw error;
    }

    group.visibility = visibility;
    await group.save();

    res
      .status(200)
      .json({ message: `Your visibility changed to ${visibility}` });
  } catch (error) {
    next(error);
  }
};

export const changePrivacy = async (req, res, next) => {
  const errors = validationResult(req);
  const userId = req.userId;
  const groupId = req.body.groupId;
  const privacy = req.body.privacy;

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Invalid Validation in Visibility");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const group = await Group.findById(groupId, {
      name: 1,
      moderator: 1,
      admins: 1,
      privacy: 1,
      visibility: 1,
    });

    if (privacy === "public" && group.visibility === "hidden") {
      const error = new Error(
        "You Can not change privacy to public because the visibility is hidden"
      );
      error.statusCode = 403;
      throw error;
    }

    if (privacy === "private" && group.privacy === "private") {
      const error = new Error(
        "You Can not change privacy to private because already is private"
      );
      error.statusCode = 403;
      throw error;
    }
    if (privacy === "public" && group.privacy === "public") {
      const error = new Error(
        "You Can not change privacy to public because already is public"
      );
      error.statusCode = 403;
      throw error;
    }

    group.privacy = privacy;
    await group.save();

    res.status(200).json({ message: `Your privacy changed to ${privacy}` });
  } catch (error) {
    next(error);
  }
};

export const changeWhoCanPost = async (req, res, next) => {
  const errors = validationResult(req);
  const userId = req.userId;
  const groupId = req.body.groupId;
  const whoCanPost = req.body.whoCanPost;

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Invalid Validation in who can post");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const group = await Group.findById(groupId, {
      whoCanPost: 1,
    });

    if (whoCanPost === "anyone" && group.whoCanPost === "anyone") {
      const error = new Error(
        "You Can not change whoCanPost to anyone because already is anyone"
      );
      error.statusCode = 403;
      throw error;
    }
    if (
      whoCanPost === "adminsAndModerator" &&
      group.whoCanPost === "adminsAndModerator"
    ) {
      const error = new Error(
        "You Can not change whoCanPost to adminsAndModerator because already is adminsAndModerator"
      );
      error.statusCode = 403;
      throw error;
    }

    group.whoCanPost = whoCanPost;
    await group.save();

    res.status(200).json({ message: ` ${whoCanPost} can  post` });
  } catch (error) {
    next(error);
  }
};
export const changeWhoCanApproveMemberRequest = async (req, res, next) => {
  const errors = validationResult(req);
  const userId = req.userId;
  const groupId = req.body.groupId;
  const whoCanApproveMemberRequest = req.body.whoCanApproveMemberRequest;

  try {
    if (!errors.isEmpty()) {
      const error = new Error(
        "Invalid Validation in who can approve member request"
      );
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const group = await Group.findById(groupId, {
      whoCanApproveMemberRequest: 1,
    });

    if (
      whoCanApproveMemberRequest === "anyone" &&
      group.whoCanApproveMemberRequest === "anyone"
    ) {
      const error = new Error(
        "You Can not change whoCanPost to anyone because already is anyone"
      );
      error.statusCode = 403;
      throw error;
    }
    if (
      whoCanApproveMemberRequest === "adminsAndModerator" &&
      group.whoCanApproveMemberRequest === "adminsAndModerator"
    ) {
      const error = new Error(
        "You Can not change whoCanPost to adminsAndModerator because already is adminsAndModerator"
      );
      error.statusCode = 403;
      throw error;
    }

    group.whoCanApproveMemberRequest = whoCanApproveMemberRequest;
    await group.save();

    res.status(200).json({
      message: ` ${whoCanApproveMemberRequest} can  approve member request`,
    });
  } catch (error) {
    next(error);
  }
};

export const addAdmin = async (req, res, next) => {
  const userId = req.body.userId;
  const groupId = req.body.groupId;
  const memberId = req.body.memberId;

  try {
    //is member in user colletion
    const member = await User.findById(memberId, { firstName: 1, lastName: 1 });
    if (!member) {
      const error = new Error("No user with this id ");
      error.statusCode = 404;
      throw error;
    }
    //is member in members group and not in admins group

    const group = await Group.findById(groupId, { members: 1, admins: 1 });
    const isMemberInGroupMember = group.members.includes(
      new mongoose.Types.ObjectId(memberId)
    );
    if (!isMemberInGroupMember) {
      const error = new Error("this id not in group member");
      error.statusCode = 404;
      throw error;
    }
    const isMemberInGroupAdmins = group.admins.includes(
      new mongoose.Types.ObjectId(memberId)
    );
    if (isMemberInGroupAdmins) {
      const error = new Error("This id already admin");
      error.statusCode = 422;
      throw error;
    }

    //here edit array members and
    group.members = group.members.filter(
      (id) => id._id.toString() !== memberId
    );
    group.admins.push(new mongoose.Types.ObjectId(memberId));
    await group.save();
    res.status(200).json({
      message: `${member.firstName} ${member.lastName} has been admin`,
    });
  } catch (error) {}
};

export const createPost = async (req, res, next) => {
  const description = req.body.description;
  const assets = req.files;
  const groupId = req.body.groupId;
  const userType = req.type;
  const user = req.user;

  try {
    const group = await Group.findById(groupId);

    if (userType === "member" && group.whoCanPost === "adminsAndModerator") {
      const error = new Error("You can not post just for admins and moderator");
      error.statusCode = 403;
    }

    if (!description && !assets) {
      const error = new Error("All fields is empty");
      error.statusCode = 400;
      throw error;
    }

    fileFilterPhotosAndVideos(assets);

    let publicidAndLink = [];
    let desc = "";
    if (assets) {
      publicidAndLink = await uploadAssets(assets, "Assets from group");
      console.log(publicidAndLink);
    }

    if (description) {
      desc = description;
    }

    const post = new Post({
      description: desc,
      userId: new mongoose.Types.ObjectId(req.userId),
      assets: publicidAndLink,
      group: group._id,
    });

    if (
      group.immediatePost === false &&
      userType !== "admin" &&
      userType !== "moderator"
    ) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const result = await post.save();
        result.link = host + "/group" + "/" + result._id.toString();
        group.requestPosts.push({
          postId: result._id,
          userId: new mongoose.Types.ObjectId(req.userId),
        });
        await result.save({ session });
        await group.save({ session });

        res.status(200).json({ message: "Your post has forwarded to admin" });
      } catch (error) {
        throw error;
      } finally {
        session.endSession();
      }
    } else {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const result = await post.save();
        result.link =
          host + "/group" + "/" + groupId + "/" + result._id.toString();

        group.posts.push({
          postId: result._id,
          userId: new mongoose.Types.ObjectId(req.userId),
          from: userType,
        });
        await result.save();
        await group.save();

        res.status(200).json({ message: "Your post created" });
      } catch (error) {
        throw error;
      } finally {
        session.endSession();
      }
    }
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const updatePost = async (req, res, next) => {
  //extract data
  const description = req.body.description;
  const deletedAssets = req.body.deletedAssets;
  const assets = req.files;
  const postId = req.body.postId;
  const groupId = req.body.groupId;
  const userType = req.type;
  const user = req.user;

  try {
    const group = await Group.findById(groupId);
    const oldPost = group.posts.find(
      (obj) =>
        obj.postId.toString() === postId &&
        obj.userId.toString() === user._id.toString()
    );
    //chekc post from coll group
    if (!oldPost) {
      const error = new Error(
        "The post not found or You are not the owner of the post"
      );
      error.statusCode = 404;
      throw error;
    }

    if (!description && !assets) {
      const error = new Error("All fields is empty");
      error.statusCode = 400;
      throw error;
    }
    //note
    //check post if found from post doc === if course should found if already found in posts array in doc group
    //beacuse when remove post from post doc you want too remove from array posts in group doc

    //get post from post collection
    const post = await Post.findById(postId);

    //this always not be false from 'note'
    if (!post) {
      const error = new Error("Post not found");
      error.statusCode = 404;
      throw error;
    }
    //

    if (post.userId.toString() !== user._id.toString()) {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    //check public id for assets user want delete should be in doc post
    //check all keys is found from client(puid-resourcetype)
    if (deletedAssets) {
      for (let i = 0; i < deletedAssets.length; i++) {
        if (
          "public_id" in deletedAssets[i] &&
          "resource_type" in deletedAssets[i]
        ) {
          continue;
        } else {
          const error = new Error("Some missing key in assets you want delete");
          error.statusCode = 404;
          throw error;
        }
      }
      for (let i = 0; i < deletedAssets.length; i++) {
        const public_id = deletedAssets[i].public_id;
        const found = post.assets.some((obj) => obj.public_id === public_id);

        if (found) {
          continue;
        } else {
          const error = new Error("Wrong in public id");
          error.statusCode = 422;
          throw error;
        }
      }
    }

    //Here you can start update

    //if user upload new assets
    var publicidAndLink; // for new assets
    if (assets) {
      fileFilterPhotosAndVideos(assets);
      publicidAndLink = await uploadAssets(assets, "Assets from Group");
    }
    //if user want delete assets //just delete from db for if something happen
    let assetsAfterDelete = [];
    if (deletedAssets) {
      assetsAfterDelete = post.assets.filter((pi) => {
        return !deletedAssets.some((piD) => pi.public_id === piD.public_id);
      });
    }

    //update post in db
    let newAssets;
    if (deletedAssets) {
      newAssets = [...assetsAfterDelete, ...publicidAndLink];
    } else {
      newAssets = [...post.assets, ...publicidAndLink];
    }

    post.description = description;
    post.assets = newAssets;
    const result = await post.save();
    if (deletedAssets) {
      await deleteAssets(deletedAssets);
    }
    res.status(200).json({ message: "Post was updated", post: result });
  } catch (error) {
    if (publicidAndLink) {
      console.log("first");
      await deleteAssets(publicidAndLink);
    }
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
export const deletePost = async (req, res, next) => {
  const groupId = req.body.groupId;
  const postId = req.body.postId;
  const userType = req.type;
  const user = req.user;

  try {
    const group = await Group.findById(groupId);
    const post = await Post.findById(postId);

    //post from group collection
    const postFromGroupCollection = group.posts.find(
      (obj) => obj.postId.toString() === postId
    );

    console.log(postFromGroupCollection);

    if (!post || !postFromGroupCollection) {
      const error = new Error("Post not found");
      error.statusCode = 404;
      throw error;
    }

    let canDelete = false;

    if (userType === "member") {
      if (
        post.userId === user._id &&
        postFromGroupCollection.userId === user._id
      ) {
        canDelete = true;
      }
    }

    if (userType === "admin" || userType === "moderator") {
      canDelete = true;
    }

    if (!canDelete) {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      throw error;
    }

    const extractedAssets = post.assets;

    await Post.findByIdAndDelete(postId);

    const newArrayPostsInDocGroup = group.posts.filter(
      (post) => post.postId.toString() !== postId
    );
    group.posts = newArrayPostsInDocGroup;
    await group.save();
    if (extractedAssets.length > 0) {
      await deleteAssets(extractedAssets);
    }

    res.status(200).json({ message: "Post was Deleted" });
  } catch (error) {
    next(error);
  }
};

export const sendRequestJoin = async (req, res, next) => {
  const groupId = req.body.groupId;
  const userId = req.userId;

  try {
    //check user if found
    const user = await User.findById(userId, {
      _id: 1,
      sentInvitesFromGroups: 1,
      groups: 1,
      joiningRequestsToGroups: 1,
    });

    if (!user) {
      const error = new Error("Auth Faild");
      error.statusCode = 401;
      throw error;
    }

    //check group if found
    const group = await Group.findById(groupId);

    if (!group) {
      const error = new Error("Did not found The  group");
      error.statusCode = 404;
      throw error;
    }
    //هل داعي اتحقق انو ال المستخدم ليس موجود بالجروب عطول لازم يكون صح مانو موجود  رح اتحقق اذا الفرونت اعد يختبر مثلا من البوست المان
    //لازم ابحث بالمدير و ادمن والاعضاء

    const isUserFoundInModerator = group.moderator.toString() === userId;
    const isUserFoundInAdmins = group.admins.includes(
      new mongoose.Types.ObjectId(userId)
    );
    const isUserFoundInMembers = group.members.includes(
      new mongoose.Types.ObjectId(userId)
    );

    if (isUserFoundInModerator || isUserFoundInAdmins || isUserFoundInMembers) {
      const error = new Error("User already in group");
      error.statusCode = 400;
      throw error;
    }
    //check if user already send a request in doc group
    const isUserSendRequestJoin = group.joiningRequests.includes(
      new mongoose.Types.ObjectId(userId)
    );
    // also check in user doc
    const isUserSendRequestJoinFromUserDoc =
      user.joiningRequestsToGroups.includes(groupId);

    if (isUserSendRequestJoin || isUserSendRequestJoinFromUserDoc) {
      const error = new Error("User already send request to join");
      error.statusCode = 400;
      throw error;
    }

    //if group is hidden and not sentInvites  -->forbidden
    //دعوة بشكل عام مابهم عضو او ادمن
    const isUserSendToHimInvite = user.sentInvitesFromGroups.find(
      (invite) => invite.groupId.toString() === group._id.toString()
    );
    if (group.visibility === "hidden" && !isUserSendToHimInvite) {
      const error = new Error("You can not send request - Forbidden");
      error.statusCode = 403;
      throw error;
    }

    //here we will send req or join immdiate

    // if user send to him invite from admin or moderator
    //if user send to him invite from member
    const isUserSendToHimInviteFromAdminOrModerator =
      user.sentInvitesFromGroups.find(
        (invite) =>
          invite.groupId.toString() === group._id.toString() &&
          (invite.senderType === "admin" || invite.senderType === "moderator")
      );
    const isUserSendToHimInviteFromMember = user.sentInvitesFromGroups.find(
      (invite) =>
        invite.groupId.toString() === group._id.toString() &&
        invite.senderType === "member"
    );

    if (group.visibility === "visible") {
      if (group.privacy === "private") {
        if (isUserSendToHimInviteFromAdminOrModerator) {
          //join immdiate
          group.members.push(new mongoose.Types.ObjectId(userId));
          user.groups.push({ groupId: group._id, role: "member" });
          user.sentInvitesFromGroups.pull({
            groupId: new mongoose.Types.ObjectId(groupId),
          });

          await group.save();
          await user.save();
          res.status(200).json({ message: "You joined to the group" });
        } else if (isUserSendToHimInviteFromMember) {
          group.joiningRequests.push(new mongoose.Types.ObjectId(userId));
          user.joiningRequestsToGroups.push(group._id);
          user.sentInvitesFromGroups.pull({
            groupId: new mongoose.Types.ObjectId(groupId),
          });

          await group.save();
          await user.save();
          res.status(200).json({ message: "Your request was sent" });
        } else {
          group.joiningRequests.push(new mongoose.Types.ObjectId(userId));
          user.joiningRequestsToGroups.push(group._id);
          user.sentInvitesFromGroups.pull({
            groupId: new mongoose.Types.ObjectId(groupId),
          });
          await group.save();
          await user.save();
          res.status(200).json({ message: "Your request was sent" });
        }

      } else {
        //هون الانضمام مباشر بس اذا في دعوة محيها
        if (isUserSendToHimInvite) {
          user.sentInvitesFromGroups.pull({
            groupId: new mongoose.Types.ObjectId(groupId),
          });
        }

        group.members.push(new mongoose.Types.ObjectId(userId));
        user.groups.push({ groupId: group._id, role: "member" });
        await group.save();
        await user.save();
        res.status(200).json({ message: "You joined to the group" });
      }
    } else {
      if (isUserSendToHimInviteFromAdminOrModerator) {
        //join immdiate
        group.members.push(new mongoose.Types.ObjectId(userId));
        user.groups.push({ groupId: group._id, role: "member" });
        user.sentInvitesFromGroups.pull({
          groupId: new mongoose.Types.ObjectId(groupId),
        });

        await group.save();
        await user.save();
        res.status(200).json({ message: "You joined to the group" });
      } else if (isUserSendToHimInviteFromMember) {
        group.joiningRequests.push(new mongoose.Types.ObjectId(userId));
        user.joiningRequestsToGroups.push(group._id);
        user.sentInvitesFromGroups.pull({
          groupId: new mongoose.Types.ObjectId(groupId),
        });

        await group.save();
        await user.save();
        res.status(200).json({ message: "Your request was sent" });
      } else {
        const error = new Error("You can not send request - Forbidden");
        error.statusCode = 403;
        throw error;
      }
    }
  } catch (error) {
    next(error);
  }
};

export const cancelRequestJoin = async (req, res, next) => {
  const groupId = req.body.groupId;
  const userId = req.userId;

  try {
    //check user if found
    const user = await User.findById(userId, {
      _id: 1,
      joiningRequestsToGroups: 1,
    });

    if (!user) {
      const error = new Error("Auth Faild");
      error.statusCode = 401;
      throw error;
    }

    //check group if found
    const group = await Group.findById(groupId);

    if (!group) {
      const error = new Error("Did not found group");
      error.statusCode = 404;
      throw error;
    }

    const isUserFoundInModerator = group.moderator.toString() === userId;
    const isUserFoundInAdmins = group.admins.includes(
      new mongoose.Types.ObjectId(userId)
    );
    const isUserFoundInMembers = group.members.includes(
      new mongoose.Types.ObjectId(userId)
    );

    if (isUserFoundInModerator || isUserFoundInAdmins || isUserFoundInMembers) {
      const error = new Error(
        "User already in group how cancel request or invaite ????????"
      );
      error.statusCode = 400;
      throw error;
    }
    // check if user already send a request
    const isUserSendRequestJoin = group.joiningRequests.includes(user._id);

    //also check in user doc
    const isUserSendRequestJoinFromUserDoc =
      user.joiningRequestsToGroups.includes(group._id);

    if (!isUserSendRequestJoin && !isUserSendRequestJoinFromUserDoc) {
      const error = new Error("User did not send a joining Request to Cancel ");
      error.statusCode = 400;
      throw error;
    }

    group.joiningRequests.pull(user._id);
    user.joiningRequestsToGroups.pull(group._id);
    await group.save();
    res.status(200).json({ message: "Joining request was Canceled  " });
  } catch (error) {
    next(error);
  }
};

export const cancelInvite = async (req, res, next) => {
  const id = req.body.id; //id الدعوة  // every doc contain _id ,senderId,...
  const userId = req.userId;
  try {
    const user = await User.findById(userId, {
      _id: 1,
      sentInvitesFromGroups: 1,
    });

    if (!user) {
      const error = new Error("Auth Faild");
      error.statusCode = 401;
      throw error;
    }

    const invite = user.sentInvitesFromGroups.find(
      (invite) => invite._id.toString() === id.toString()
    );

    if (!invite) {
      const error = new Error("did not found the invite");
      error.statusCode = 404;
      throw error;
    }

    const group = await Group.findById(invite.groupId, { sentInvites: 1 });

    // if (!group) {
    //   const error = new Error("did not found the group");
    //   error.statusCode = 404;
    //   throw error;
    // }  //مافي داعي انا عم ارفض دعوة اذا بدي اقبل لازم اتحقق بركي الجروب ملغي

    user.sentInvitesFromGroups.pull({ _id: new mongoose.Types.ObjectId(id) });
    group.sentInvites.pull({
      $elemMatch: {
        addressee: new mongoose.Types.ObjectId(userId),
        senderId: invite.senderId,
      },
    });

    await user.save();
    await group.save();
    res.status(200).json({ message: "Invite was canceled" });
  } catch (error) {
    next(error);
  }
};

export const inviteUser = async (req, res, next) => {
  const user = req.user;
  const userType = req.type;
  const groupId = req.body.groupId;
  const addresseeId = req.body.addresseeId;

  try {
    const addressee = await User.findById(addresseeId, {
      sentInvitesFromGroups: 1,
      firstName: 1,
      lastName: 1,
    });

    if (!addressee) {
      const error = new Error("did not found addressee");
      error.statusCode = 404;
      throw error;
    }

    const isYourFriend = user.friends.includes(
      new mongoose.Types.ObjectId(addresseeId)
    );
    if (!isYourFriend) {
      const error = new Error("Not your friend-Forbidden");
      error.statusCode = 403;
      throw error;
    }
    const group = await Group.findById(groupId);

    const isaddresseeFoundInModerator =
      group.moderator.toString() === addresseeId;
    const isaddresseeFoundInAdmins = group.admins.includes(
      new mongoose.Types.ObjectId(addresseeId)
    );
    const isaddresseeFoundInMembers = group.members.includes(
      new mongoose.Types.ObjectId(addresseeId)
    );

    if (
      isaddresseeFoundInModerator ||
      isaddresseeFoundInAdmins ||
      isaddresseeFoundInMembers
    ) {
      const error = new Error("Addressee already in group");
      error.statusCode = 400;
      throw error;
    }

    //here can send invite

    

    const sentInviteFromGroup = {
      senderId: user._id,
      senderType: userType,
      groupId: group._id,
    };

    // if you already send to this user
    const isInviteSentbeforeFromGroup = addressee.sentInvitesFromGroups.find(
      (invite) => {
        return (
          invite.senderId.toString() === user._id.toString() &&
          invite.groupId.toString() === group._id.toString()
        );
      }
    );

 

    if (isInviteSentbeforeFromGroup) {
      const error = new Error(
        `You already sent invite to ${addressee.firstName} ${addressee.lastName} `
      );
      error.statusCode = 400;
      throw error;
    }

    addressee.sentInvitesFromGroups.push(sentInviteFromGroup);

    await addressee.save();
    res.status(200).json({
      message: `Invite was sended to ${addressee.firstName} ${addressee.lastName} `,
    });
  } catch (error) {
    next(error);
  }
};




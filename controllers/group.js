import { validationResult } from "express-validator";
import User from "../models/user.js";
import Group from "../models/group.js";

import {
  deleteAssets,
  fileFilterPhotosAndVideos,
  uploadAssets,
} from "../util/file.js";
import mongoose from "mongoose";
import Post from "../models/post.js";

import { createError } from "../util/helpers.js";

import {
  admins,
  joiningRequest,
  mainInformationForAdminsAndModerator,
  mainInformationForMembers,
  mainInformationForNotMembers,
  members,
  membersBlocked,
  posts,
  reports,
  reportsFromAdmin,
  requestPosts,
  yourRequestPost,
} from "../util/queries/group.js";
import { information } from "../util/queries/pagination.js";
import {
  WhoCanPostorApproveMemberRequest,
  privacy as privacyGroup,
  visibility,
} from "../util/configGroup.js";
import { groupRoles } from "../util/roles.js";

export const createGroup = async (req, res, next) => {
  const errors = validationResult(req);
  const yourId = req.userId;
  const name = req.body.name;
  const privacy = req.body.privacy;
  const visibility = req.body.visibility;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    //Check if Validation Failed
    if (!errors.isEmpty()) {
      createError(422, "Validation failed", errors.array());
    }
    //Create new Schema
    const group = new Group({ name, privacy, visibility, moderator: yourId });
    //save in Group Collection
    const result = await group.save({ session });
    //save in User Collection
    await User.updateOne(
      { _id: yourId },
      {
        $push: { groups: result._id },
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();
    res
      .status(201)
      .json({ message: "Your group has been created", groupId: result._id });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    next(error);
  }
};

export const addCoverPhoto = async (req, res, next) => {
  const cover = req.files;
  const groupId = req.body.groupId;

  try {
    //check if uploaded more than one photo
    if (cover.length !== 1) {
      createError(422, "Please upload one photo");
    }
    // Filter photo (for example if he upload pdf file)
    fileFilterPhotosAndVideos(cover);

    //Get group with cover
    const group = await Group.findOne(
      { _id: groupId, cover: { $exists: false } },
      { cover: 1 }
    );

    //Check if you already added one
    !group ? createError("400", "There is a previous cover") : null;

    //Upload cover to cloudinary
    var publicidAndLink = await uploadAssets(
      cover,
      `Assets_from_group/${groupId}/cover`
    );

    //save change in db
    group.cover = publicidAndLink[0];
    await group.save();

    res
      .status(200)
      .json({ message: "Cover has been updated", link: publicidAndLink[0] });
  } catch (error) {
    if (publicidAndLink) {
      await deleteAssets(publicidAndLink);
    }
    next(error);
  }
};
export const updateCoverPhoto = async (req, res, next) => {
  const cover = req.files;
  const groupId = req.body.groupId;

  try {
    //check if uploaded more than one photo
    if (cover.length !== 1) {
      createError(422, "Please upload one photo");
    }
    // Filter photo (for example if he upload pdf file)
    fileFilterPhotosAndVideos(cover);
    //Get group with old cover
    const group = await Group.findOne(
      { _id: groupId, cover: { $exists: true } },
      { cover: 1 }
    );
    //Check if you not added one
    !group ? createError("400", "There is no previous cover") : null;

    //Upload cover to cloudinary
    var publicidAndLink = await uploadAssets(
      cover,
      `Assets from group/${groupId}/cover`
    );

    //extract old cover
    const oldCover = group.cover;
    //Update db and temp for ensure we save changes in db and now can delete cover from cloudinary
    group.cover = publicidAndLink[0];
    var temp = 0;
    await group.save();
    temp = 1;

    res
      .status(200)
      .json({ message: "Cover has been updated ", link: publicidAndLink[0] });

    temp ? await deleteAssets([oldCover]) : null;
  } catch (error) {
    if (temp === 0) {
      if (publicidAndLink) {
        await deleteAssets(publicidAndLink);
      }
    }
    next(error);
  }
};

export const addDescription = async (req, res, next) => {
  const errors = validationResult(req);
  const description = req.body.description;
  const groupId = req.body.groupId;

  try {
    //check validation
    !errors.isEmpty()
      ? createError(422, "Description should not be empty")
      : null;

    const group = await Page.findOneAndUpdate(
      {
        _id: groupId,
        description: { $exists: false },
      },
      {
        description: description,
      },
      {
        new: true, //
        select: "_id", //
      }
    );
    !group ? createError(404, "There is previous description") : null;
    //send response
    res.status(200).json({ message: "Description was added " });
  } catch (error) {
    next(error);
  }
};
export const updateDescription = async (req, res, next) => {
  const errors = validationResult(req);
  const description = req.body.description;
  const groupId = req.body.groupId;

  try {
    //Check validation
    !errors.isEmpty()
      ? createError(422, "Description should not be empty")
      : null;
    const group = await Page.findOneAndUpdate(
      {
        _id: groupId,
        description: { $exists: true },
      },
      {
        description: description,
      },
      {
        new: true, //
        select: "_id", //
      }
    );
    !group ? createError(404, "There is previous description") : null;

    //send response
    res.status(200).json({ message: "Description has been updated " });
  } catch (error) {
    next(error);
  }
};

export const updateName = async (req, res, next) => {
  const errors = validationResult(req);
  const name = req.body.name;
  const groupId = req.body.groupId;

  try {
    !errors.isEmpty()
      ? createError(422, "Validation failed", errors.array())
      : null;

    await Group.updateOne(
      { _id: groupId },
      {
        name: name,
      }
    );

    //send response
    res.status(200).json({ message: "Name has been updated " });
  } catch (error) {
    next(error);
  }
};

export const changeVisibility = async (req, res, next) => {
  const errors = validationResult(req);
  const groupId = req.body.groupId;
  const visibility = req.body.visibility;

  try {
    //check validation
    !errors.isEmpty() ? createError(422, "Invalid Validation") : null;
    //get group with visibility
    const group = await Group.findOne(
      {
        _id: groupId,
        visibility: { $ne: visibility },
      },
      { visibility: 1, privacy: 1 }
    );

    //check if visi equal to visi which send
    !group ? createError(400, `Already ${visibility}`) : null;

    //check if privacy is public and visi which send is hidden because forbidden
    visibility === visibility.HIDDEN && group.privacy === privacyGroup.PUBLIC
      ? createError(
          403,
          "You can not change visibility to hidden because the privacy is public"
        )
      : null;

    //save changes in db
    group.visibility = visibility;
    await group.save();
    //send response
    res
      .status(200)
      .json({ message: `Your visibility changed to ${visibility}` });
  } catch (error) {
    next(error);
  }
};

export const changePrivacy = async (req, res, next) => {
  const errors = validationResult(req);
  const groupId = req.body.groupId;
  const privacy = req.body.privacy;

  try {
    //check validation
    !errors.isEmpty() ? createError(422, "Invalid Validation") : null;

    //get group with privacy
    const group = await Group.findOne(
      {
        _id: groupId,
        privacy: { $ne: privacy },
      },
      { privacy: 1, visibility: 1 }
    );

    //check if privacy equal to privacy which send
    !group ? createError(400, `Already ${privacy}`) : null;

    //check if privacy is public and visi in db is hidden  because forbidden

    if (
      privacy === privacyGroup.PUBLIC &&
      group.visibility === visibility.HIDDEN
    ) {
      createError(
        403,
        "You can not change privacy to public because the visibility is hidden"
      );
    }

    //save changes in db
    group.privacy = privacy;
    await group.save();
    //send response
    res.status(200).json({ message: `Your privacy changed to ${privacy}` });
  } catch (error) {
    next(error);
  }
};

export const changeWhoCanPost = async (req, res, next) => {
  const errors = validationResult(req);
  const groupId = req.body.groupId;
  const whoCanPost = req.body.whoCanPost;

  try {
    //check validation
    !errors.isEmpty() ? createError(422, "Invalid Validation") : null;

    const group = await Group.findOneAndUpdate(
      {
        _id: groupId,
        whoCanPost: { $ne: whoCanPost },
      },
      { whoCanPost: whoCanPost },
      {
        new: true,
        select: "_id",
      }
    );

    !group ? createError(400, `Already ${whoCanPost}`) : null;

    //send response
    res.status(200).json({ message: `${whoCanPost} can post` });
  } catch (error) {
    next(error);
  }
};

export const changeImmediatePost = async (req, res, next) => {
  const groupId = req.body.groupId;
  const immediatePost = +req.body.immediatePost;

  try {
    //check validation
    immediatePost !== 0 && immediatePost !== 1
      ? createError(422, "Immediate post should be 0 or 1")
      : null;

    const group = await Group.findOneAndUpdate(
      {
        _id: groupId,
        immediatePost: { $ne: immediatePost },
      },
      { immediatePost: immediatePost },
      {
        new: true, //
        select: "_id", //
      }
    );

    //check if immediatePost equal to immediatePost which send
    !group ? createError(400, `Already ${immediatePost}`) : null;

    //send response
    res.status(200).json({
      message: ` ${
        immediatePost === 1
          ? "Immediate Post is active"
          : "Immediate Post is not active"
      } `,
    });
  } catch (error) {
    next(error);
  }
};

export const changeWhoCanApproveMemberRequest = async (req, res, next) => {
  const errors = validationResult(req);
  const groupId = req.body.groupId;
  const whoCanApproveMemberRequest = req.body.whoCanApproveMemberRequest;

  try {
    //check validation
    !errors.isEmpty() ? createError(422, "Invalid Validation") : null;
    //get group with whoCanApproveMemberRequest
    const group = await Group.findOneAndUpdate(
      {
        _id: groupId,
        whoCanApproveMemberRequest: { $ne: whoCanApproveMemberRequest },
      },
      { whoCanApproveMemberRequest: whoCanApproveMemberRequest },
      {
        new: true,
        select: "_id",
      }
    );

    //check if whoCanApproveMemberRequest equal to whoCanApproveMemberRequest which send
    !group ? createError(400, `Already ${whoCanApproveMemberRequest}`) : null;

    //send response
    res.status(200).json({
      message: ` ${whoCanApproveMemberRequest} can  approve member request`,
    });
  } catch (error) {
    next(error);
  }
};

export const addAdmin = async (req, res, next) => {
  const groupId = req.body.groupId;
  const memberId = req.body.memberId;

  try {
    //no need to check if member found in users collection
    //because when delete user permnantly will leave all group

    // // Check if member exists
    // const member = await User.findById(memberId, {
    //   firstName: 1,
    //   lastName: 1,
    //   groups: 1,
    // });

    // if (!member) {
    //   createError(404, "There are no user with this ID");
    // }

    // should be in members  to upgrade to admin
    const group = await Group.findOne(
      {
        _id: groupId,
        members: { $elemMatch: { userId: memberId } },
      },
      { "members.$": 1 }
    );

    //check if not found in members
    !group ? createError(404, "There are no member with this ID") : null;

    //extract info about the member

    const member = group.members[0];
    await Group.findByIdAndUpdate(groupId, {
      $pull: { members: member },
      $push: { admins: member },
    });

    res.status(200).json({
      message: `This member has been made an admin.`,
      member,
    });
  } catch (error) {
    next(error);
  }
};

export const AcceptRequestJoin = async (req, res, next) => {
  const userId = req.body.userId; // لبعت انضمام
  const groupId = req.body.groupId;
  const userRole = req.Role;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const group = await Group.findOneAndUpdate(
      {
        _id: groupId,
        "joiningRequests.userId": { $eq: userId },
        whoCanApproveMemberRequest:
          userRole === groupRoles.MEMBER
            ? { $ne: WhoCanPostorApproveMemberRequest.ADMINS_AND_MODERATOR }
            : {
                $in: [
                  WhoCanPostorApproveMemberRequest.ANY_ONE_IN_GROUP,
                  WhoCanPostorApproveMemberRequest.ADMINS_AND_MODERATOR,
                ],
              },
      },
      {
        $pull: { joiningRequests: { userId: userId } },
        $push: { members: { userId: userId, joiningDate: new Date() } },
      },
      {
        new: true,
        select: "_id",
        session,
      }
    );

    //check if he send request
    !group
      ? createError(400, " User did not send request or you can accept request")
      : null;

    //save changes in db
    await User.updateOne(
      { _id: userId },
      {
        $push: { groups: groupId },
        $pull: { sentInvitesFromGroups: { groupId: groupId } },
      },
      { session }
    );
    await session.commitTransaction();
    session.endSession();
    //send response
    res.status(200).json({
      message: `succss`,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
export const rejectRequestJoin = async (req, res, next) => {
  const userId = req.body.userId; //id لبعت انضمام
  const groupId = req.body.groupId;

  try {
    const group = await Group.findOneAndUpdate(
      {
        _id: groupId,
        "joiningRequests.userId": { $eq: userId },
      },
      { $pull: { joiningRequests: { userId: userId } } },
      {
        new: true,
        select: "_id",
      }
    );
    //check if he send request
    !group ? createError(404, " User did not send request") : null;

    res.status(200).json({
      message: `You reject the request `,
    });
  } catch (error) {
    next(error);
  }
};

export const acceptRequestPost = async (req, res, next) => {
  const groupId = req.body.groupId;
  const _idPost = req.body._id; //_id post from posts collection  because when get will admin have it

  try {
    const group = await Group.findOneAndUpdate(
      {
        _id: groupId,
        "requestPosts.postId": { $in: _idPost },
      },
      {
        $pull: { requestPosts: { postId: _idPost } },
        $push: { posts: _idPost },
      },
      {
        new: true, //
        select: "_id", //
      }
    );

    !group ? createError("404", "There are no post with this ID") : null;

    res.status(200).json({ message: "Post has been accepted" });
  } catch (error) {
    next(error);
  }
};
export const rejectRequestPost = async (req, res, next) => {
  const groupId = req.body.groupId;
  const _idPost = req.body._id;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const group = await Group.findOneAndUpdate(
      {
        _id: groupId,
        "requestPosts.postId": { $in: _idPost },
      },
      {
        $pull: { requestPosts: { postId: _idPost } },
      },
      {
        new: true, //
        select: "_id", //
        session,
      }
    );
    !group ? createError("404", "There are no post with this ID") : null;

    const post = await Post.findById(_idPost, { assets: 1 });

    const extractedAssets = post.assets;
    let done = 0;
    await Post.findByIdAndDelete(post._id, { session });
    done = 1;

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Post has been Deleted" });

    if (extractedAssets.length > 0 && done === 1) {
      await deleteAssets(extractedAssets);
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const reportPost = async (req, res, next) => {
  const postId = req.body.postId;
  const groupId = req.body.groupId;
  const description = req.body.description;
  const yourId = req.userId;
  const userRole = req.role;

  try {
    if (userRole === groupRoles.MODERATOR) {
      createError(403, "No need to Report You are the moderator");
    }
    if (!description) {
      createError(422, "description is empty");
    }
    const post = await Post.findById(postId, {
      _id: 1,
      userId: 1,
      userRole: 1,
    });
    if (!post) {
      createError(404, "There are no post with this ID");
    }

    if (yourId.toString() === post.userId.toString()) {
      createError(403, "You can not report on your self");
    }
    if (post.userRole === groupRoles.MODERATOR) {
      createError(403, "You cannot report about the group manager");
    }

    if (post.userRole === groupRoles.MEMBER && userRole === groupRoles.ADMIN) {
      createError(403, "No need to report You are  admin");
    }

    // here you can report
    const report = {
      from: yourId,
      postId: post._id,
      description: description,
      idOfOwnerPost: post.userId,
      reportDate: new Date(),
    };

    if (userRole === groupRoles.MEMBER) {
      await Group.updateOne(
        { _id: groupId },
        //if he report again for same post remove old and put new
        [
          {
            $set: {
              reports: {
                $concatArrays: [
                  {
                    $filter: {
                      input: "$reports",
                      cond: {
                        $not: {
                          $and: [
                            { $eq: ["$$this.postId", post._id] },
                            { $eq: ["$$this.from", yourId] },
                          ],
                        },
                      },
                    },
                  },
                  [report],
                ],
              },
            },
          },
        ]
      );
      res.status(200).json({
        message:
          post.userRole === groupRoles.ADMIN
            ? "Your report has been sent admin will not show your report"
            : "Your report has been sent",
      });
    }

    if (userRole === groupRoles.ADMIN) {
      await Group.updateOne(
        { _id: groupId },
        //if he report again for same post remove old and put new
        [
          {
            $set: {
              reports: {
                $concatArrays: [
                  {
                    $filter: {
                      input: "$reportsFromAdmin",
                      cond: {
                        $not: {
                          $and: [
                            { $eq: ["$$this.postId", post._id] },
                            { $eq: ["$$this.from", yourId] },
                          ],
                        },
                      },
                    },
                  },
                  [report],
                ],
              },
            },
          },
        ]
      );
      res
        .status(200)
        .json({ message: "Your report has been sent to moderator" });
    }
  } catch (error) {
    next(error);
  }
};

export const deleteReportPostFromAdmin = async (req, res, next) => {
  const _idReport = req.body._id;
  const groupId = req.body.groupId;

  try {
    const group = await Group.findOneAndUpdate(
      {
        _id: groupId,
        "reportsFromAdmin._id": { $eq: _idReport },
      },
      {
        $pull: { reportsFromAdmin: { _id: _idReport } },
      },
      {
        new: true, //
        select: "_id", //
      }
    );

    !group ? createError(404, "There are no report with this ID") : null;

    res.status(200).json({ message: "report was deleted" });
  } catch (error) {
    next(error);
  }
};

export const deleteReportPost = async (req, res, next) => {
  const _idReport = req.body._id;
  const groupId = req.body.groupId;
  const yourId = req.userId;
  try {
    const group = await Group.findOneAndUpdate(
      {
        _id: groupId,
        "reports._id": { $eq: _idReport },
        "reports.idOfOwnerPost": { $ne: yourId },
      },
      {
        $pull: { reports: { _id: _idReport } },
      },
      {
        new: true, //
        select: "_id", //
      }
    );

    !group ? createError(404, "There are no report with this ID") : null;

    res.status(200).json({ message: "report has been  deleted" });
  } catch (error) {
    next(error);
  }
};

export const blockMemberOrAdmin = async (req, res, next) => {
  const memberId = req.body.memberId;
  const keepPosts = +req.body.keepPosts; //0=clear 1=keep
  const groupId = req.body.groupId;
  const userRole = req.role;
  const yourId = req.userId;
  console.log(keepPosts);
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    //check validation
    if (keepPosts !== 0 && keepPosts !== 1) {
      createError(422, "Keep posts should be 0 or 1");
    }
    // Prevent blocking self
    if (yourId.toString() === memberId) {
      createError(403, "You can not block your self");
    }
    // Retrieve group information
    const group = await Group.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(groupId),
          $or: [
            {
              "members.userId": { $eq: new mongoose.Types.ObjectId(memberId) },
            },
            { "admins.userId": { $eq: new mongoose.Types.ObjectId(memberId) } },
          ],
        },
      },
      {
        $project: {
          members: {
            $filter: {
              input: "$members",
              as: "member",
              cond: {
                $eq: ["$$member.userId", new mongoose.Types.ObjectId(memberId)],
              },
            },
          },
          admins: {
            $filter: {
              input: "$admins",
              as: "admin",
              cond: {
                $eq: ["$$admin.userId", new mongoose.Types.ObjectId(memberId)],
              },
            },
          },
        },
      },
    ]);

    group.length === 0
      ? createError(404, "There no member with this ID")
      : null;

    // Prevent admin blocking another admin
    if (group[0].admins.length > 0 && userRole === groupRoles.ADMIN) {
      createError(403, "You can not block admin - Forbidden");
    }

    let assets = [];
    let ids = [];
    //extract assets and ids of posts and assets of commeent for each post
    if (keepPosts === 0) {
      const posts = await Post.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(memberId),
            group: new mongoose.Types.ObjectId(groupId),
          },
        },
        { $unwind: { path: "$assets", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$comments", preserveNullAndEmptyArrays: true } },
        {
          $unwind: {
            path: "$comments.assets",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            assets: 1,
            comments: "$comments.assets",
          },
        },

        {
          $group: {
            _id: null,
            assets: { $push: "$assets" },
            comments: { $push: "$comments" },
            ids: {
              $push: "$_id",
            },
          },
        },
        {
          $project: {
            _id: 0,
            assets: { $concatArrays: ["$assets", "$comments"] },
            ids: 1,
          },
        },
      ]);

      if (posts.length > 0) {
        if (posts[0].assets) {
          assets = posts[0].assets;
        }
        if (posts[0].ids) {
          ids = posts[0].ids;
        }
      }
    }
    let done = 0;
    //update db

    if (keepPosts === 0) {
      if (group[0].admins.length > 0) {
        await Group.updateOne(
          { _id: groupId },
          {
            $pull: {
              admins: { userId: memberId },
              reports: { idOfOwnerPost: memberId },
              reportsFromAdmin: { idOfOwnerPost: memberId },
              posts: { $in: ids },
            },

            $push: { membersBlocked: memberId },
          },
          {
            session,
          }
        );
      } else {
        await Group.updateOne(
          { _id: groupId },
          {
            $pull: {
              members: { userId: new mongoose.Types.ObjectId(memberId) },
              reports: { idOfOwnerPost: new mongoose.Types.ObjectId(memberId) },
              posts: { $in: ids },
              requestPosts: { postId: { $in: ids } },
            },

            $push: { membersBlocked: new mongoose.Types.ObjectId(memberId) },
          },
          {
            session,
          }
        );
      }
    } else {
      if (group[0].admins.length > 0) {
        await Group.updateOne(
          { _id: groupId },
          {
            $pull: {
              admins: { userId: memberId },
              reports: { idOfOwnerPost: memberId },
              reportsFromAdmin: { idOfOwnerPost: memberId },
            },

            $push: { membersBlocked: memberId },
          },
          {
            session,
          }
        );
      } else {
        console.log("first");
        await Group.updateOne(
          { _id: groupId },
          {
            $pull: {
              members: { userId: new mongoose.Types.ObjectId(memberId) },
              reports: { idOfOwnerPost: new mongoose.Types.ObjectId(memberId) },
            },

            $push: { membersBlocked: new mongoose.Types.ObjectId(memberId) },
          },
          {
            session,
          }
        );
      }
    }

    //update user document
    await User.updateOne(
      { _id: memberId },
      {
        $pull: { groups: group[0]._id },
        $push: { blockedGroups: group[0]._id },
      },
      { session }
    );
    //delete posts
    if (keepPosts === 0) {
      await Post.deleteMany(
        {
          _id: { $in: ids },
        },
        {
          session,
        }
      );
    }

    done = 1;
    await session.commitTransaction();
    session.endSession();
    //send request
    res.status(200).json({
      message: `The Member has been blocked ${
        keepPosts === 0 ? "and all his posts was removed" : ""
      }`,
    });
    //delete assets from db
    if (assets.length > 0 && done === 1) {
      await deleteAssets(assets);
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const unblockMember = async (req, res, next) => {
  const memberId = req.body.memberId;
  const groupId = req.body.groupId;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    //In one call find and update
    const group = await Group.findOneAndUpdate(
      {
        _id: groupId,
        membersBlocked: { $in: memberId },
      },
      {
        $pull: { membersBlocked: memberId },
        $push: { members: { userId: memberId, joiningDate: new Date() } },
      },
      {
        new: true, //
        select: "_id", //
        session,
      }
    );
    //check if did not find
    !group ? createError(404, "There are no member with this ID") : null;

    //update user in users collection
    await User.updateOne(
      {
        _id: memberId,
      },
      {
        $pull: { blockedGroups: groupId },
        $push: { groups: groupId },
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();
    //return response
    res.status(200).json({
      message: `The member has been unblocked`,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const leaveGroup = async (req, res, next) => {
  const groupId = req.body.groupId;
  const userRole = req.role;
  const yourId = req.userId;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    //if you are  admin and you want leave
    if (userRole === groupRoles.ADMIN) {
      await Group.updateOne(
        {
          _id: groupId,
        },
        {
          $pull: { admins: { userId: yourId } },
        },
        {
          session,
        }
      );
    } else if (userRole === groupRoles.MODERATOR) {
      //get oldest admin and member
      const result = await Group.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(groupId),
          },
        },
        {
          $project: {
            oldestAdmin: {
              $cond: {
                if: {
                  $eq: [{ $size: "$admins" }, 0], // Check if the array is empty
                },
                then: [],
                else: {
                  $reduce: {
                    input: "$admins",
                    initialValue: { joiningDate: new Date() }, // Set initial value to a very large date
                    in: {
                      $cond: {
                        if: {
                          $lt: ["$$this.joiningDate", "$$value.joiningDate"],
                        },
                        then: "$$this",
                        else: "$$value",
                      },
                    },
                  },
                },
              },
            },
            oldestMember: {
              $cond: {
                if: {
                  $eq: [{ $size: "$members" }, 0], // Check if the array is empty
                },
                then: [],
                else: {
                  $reduce: {
                    input: "$members",
                    initialValue: { joiningDate: new Date() }, // Set initial value to a very large date
                    in: {
                      $cond: {
                        if: {
                          $lt: ["$$this.joiningDate", "$$value.joiningDate"],
                        },
                        then: "$$this",
                        else: "$$value",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ]);

      //check if there are admins or members
      Object.keys(result[0].oldestAdmin).length === 0 &&
      Object.keys(result[0].oldestMember).length === 0
        ? createError(
            403,
            "You can not leave the group - You can deleted it permanantly"
          )
        : null;

      //first if there are admin put oldest admin as moderator
      if (Object.keys(result[0].oldestAdmin).length > 0) {
        await Group.updateOne(
          {
            _id: groupId,
          },
          {
            moderator: result[0].oldestAdmin.userId,
            $pull: { admins: { userId: result[0].oldestAdmin.userId } },
          },
          {
            session,
          }
        );
      } else {
        //if there are no admins put oldest member moderator
        await Group.updateOne(
          {
            _id: groupId,
          },
          {
            moderator: result[0].oldestMember.userId,
            $pull: { members: { userId: result[0].oldestMember.userId } },
          },
          {
            session,
          }
        );
      }
    } else {
      //if you are  member and you want leave
      await Group.updateOne(
        {
          _id: groupId,
        },
        {
          $pull: { members: { userId: yourId } },
        },
        {
          session,
        }
      );
    }
    //update your doc from users collection

    await User.updateOne(
      { _id: yourId },
      {
        $pull: { groups: groupId },
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "You left the group" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
export const fromAdminToMember = async (req, res, next) => {
  const groupId = req.body.groupId;
  const adminId = req.body.adminId;

  try {
    const group = await Group.findOne(
      {
        _id: groupId,
        admins: {
          $elemMatch: {
            userId: adminId,
          },
        },
      },

      {
        _id: 1,
        "admins.$": 1,
      }
    );

    !group ? createError(404, "There are no admin with this ID") : null;

    await Group.updateOne(
      {
        _id: groupId,
      },
      {
        $pull: { admins: { userId: adminId } },
        $push: { members: group.admins[0] },
      }
    );

    res.status(200).json({ message: `The admin become member` });
  } catch (error) {
    next(error);
  }
};

export const deleteGroup = async (req, res, next) => {
  const groupId = req.body.groupId;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    //1-extract ids of members,admins and id of moderator + cover
    const group = await Group.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(groupId),
        },
      },
      {
        $project: {
          admins: 1,
          members: 1,
          membersBlocked: 1,
          moderator: 1,
          cover: 1,
        },
      },
      { $unwind: { path: "$admins", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$members", preserveNullAndEmptyArrays: true } },
      {
        $unwind: { path: "$membersBlocked", preserveNullAndEmptyArrays: true },
      },

      {
        $project: {
          _id: 1,
          admins: "$admins.userId",
          members: "$members.userId",
          membersBlocked: 1,
          moderator: 1,
          cover: 1,
        },
      },
      {
        $group: {
          _id: null,
          admins: { $push: "$admins" },
          members: { $push: "$members" },
          membersBlocked: { $addToSet: "$membersBlocked" },
          moderator: { $addToSet: "$moderator" },
          cover: { $addToSet: "$cover" },
        },
      },
      {
        $project: {
          _id: 0,
          allMembers: {
            $concatArrays: [
              "$admins",
              "$members",
              "$moderator",
              "$membersBlocked",
            ],
          },
          cover: 1,
        },
      },
      { $unwind: { path: "$cover", preserveNullAndEmptyArrays: true } },
    ]);

    //2-extract assets and ids of posts +assets of comments
    let assets = [];
    let ids = [];
    //extract assets and ids of posts and assets of comment for each post
    const posts = await Post.aggregate([
      {
        $match: {
          group: new mongoose.Types.ObjectId(groupId),
        },
      },
      { $unwind: { path: "$assets", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$comments", preserveNullAndEmptyArrays: true } },
      {
        $unwind: {
          path: "$comments.assets",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 1,
          assets: 1,
          comments: "$comments.assets",
        },
      },
      {
        $group: {
          _id: null,
          assets: { $push: "$assets" },
          comments: { $push: "$comments" },
          ids: {
            $push: "$_id",
          },
        },
      },
      {
        $project: {
          _id: 0,
          assets: { $concatArrays: ["$assets", "$comments"] },
          ids: 1,
        },
      },
    ]);
    if (posts.length > 0) {
      if (posts[0].assets) {
        assets = posts[0].assets;
      }
      if (posts[0].ids) {
        ids = posts[0].ids;
      }
    }
    if (group[0].cover) {
      assets.push(group[0].cover);
    }

    let done = 0;
    // 3-update users collection : pull group for all member and for member is blocked also pull group
    let allMembers = group[0].allMembers;
    await User.updateMany(
      {
        _id: { $in: allMembers },
      },
      {
        $pull: {
          groups: groupId,
          blockedGroups: groupId,
        },
      },
      {
        session,
      }
    );

    //4-delete all invite from this group
    await User.updateMany(
      {},
      { $pull: { sentInvitesFromGroups: { groupId: groupId } } },
      {
        session,
      }
    );
    //5- delete posts
    await Post.deleteMany({ _id: { $in: ids } }, { session });
    //6-delete group
    await Group.deleteOne(
      { _id: new mongoose.Types.ObjectId(groupId) },
      { session }
    );
    done = 1;
    await session.commitTransaction();
    session.endSession();
    //7-send response
    res.status(200).json({ message: "done" });
    //8-delete assets from cloudinary
    if (assets.length > 0 && done === 1) {
      await deleteAssets(assets);
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const inviteUser = async (req, res, next) => {
  const yourId = req.userId;
  const userRole = req.role;
  const groupId = req.body.groupId;
  const addresseeId = req.body.addresseeId;

  try {
    // no need check why? because if not found will not show in friends of sender
    // const addressee = await User.findById(addresseeId, {
    //   sentInvitesFromGroups: 1,
    //   firstName: 1,
    //   lastName: 1,
    // });

    // if (!addressee) {
    //   createError(404, "There are no addressee with this ID");
    // }

    // Check if he is in your friends

    const isYourFriend = await User.findOne(
      {
        _id: yourId,
        friends: { $in: addresseeId },
      },
      { select: "_id" }
    );

    !isYourFriend ? createError(403, "Not among your friends") : null;

    const group = await Group.findOne(
      {
        _id: groupId,
        "members.userId": { $ne: addresseeId },
        "admins.userId": { $ne: addresseeId },
        moderator: { $ne: addresseeId },
        membersBlocked: { $nin: addresseeId },
      },
      { _id: 1 }
    );

    !group ? createError(403, "Forbidden") : null;

    //create object for push to addressee
    const sentInviteFromGroup = {
      senderId: yourId,
      senderRole: userRole,
      groupId: group._id,
      inviteDate: new Date(),
    };

    await User.findOneAndUpdate(
      { _id: addresseeId },
      {
        $pull: {
          sentInvitesFromGroups: {
            senderId: yourId,
            groupId: group._id,
          },
        },
      }
    );
    await User.findOneAndUpdate(
      { _id: addresseeId },
      {
        $push: {
          sentInvitesFromGroups: sentInviteFromGroup,
        },
      }
    );
    res.status(200).json({
      message: `Invite has been sended`,
    });
  } catch (error) {
    next(error);
  }
};

/////////////////

/////////////////

export const getMainInformations = async (req, res, next) => {
  const groupId = req.params.groupId;

  const yourId = req.userId;

  const role = req.role;
  const isHeinvited = req.isHeinvited;
  const isHeSendRequest = req.isHeSendRequest;
  const privacy = req.privacy;

  try {
    if (role === groupRoles.NOT_Member) {
      const group = await Group.aggregate(
        mainInformationForNotMembers(
          groupId,
          role,
          isHeSendRequest,
          isHeinvited,
          privacy
        )
      );

      res.status(200).json({ mainInfo: group });
    } else if (role === groupRoles.MEMBER) {
      const group = await Group.aggregate(
        mainInformationForMembers(
          groupId,
          role,
          isHeSendRequest,
          isHeinvited,
          yourId
        )
      );

      res.status(200).json({ mainInfo: group });
    } else {
      const group = await Group.aggregate(
        mainInformationForAdminsAndModerator(groupId, role)
      );

      res.status(200).json({ mainInfo: group });
    }
  } catch (error) {
    next(error);
  }
};

export const getMembers = async (req, res, next) => {
  const groupId = req.params.groupId;
  const role = req.role;

  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;

  try {
    role === groupRoles.NOT_Member ? createError(403, "Forbidden") : null;

    const aggregationResult = await Group.aggregate(
      members(groupId, page, ITEMS_PER_PAGE)
    );

    const totalMembers = aggregationResult[0].totalCount;

    res.status(200).json({
      members: aggregationResult[0].allMembers,
      extraInfo: information(totalMembers, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};

export const getModerator = async (req, res, next) => {
  const groupId = req.params.groupId;
  const role = req.role;

  try {
    role === groupRoles.NOT_Member ? createError(403, "Forbidden") : null;

    const group = await Group.findById(groupId, {
      moderator: 1,
      createdAt: 1, // Include the createdAt field
      _id: 0,
    })
      .populate({
        path: "moderator",
        select: {
          firstName: 1,
          lastName: 1,
          logo: { $arrayElemAt: ["$profilePhotos", -1] },
        },
      })
      .lean(); // Use lean() to return a plain JavaScript object instead of a Mongoose document

    if (group) {
      group.joiningDate = group.createdAt; // Rename createdAt to joiningDate
      delete group.createdAt; // Remove the original createdAt field if desired
    } // Rename _id to userId for moderator
    if (group.moderator && group.moderator._id) {
      group.moderator.userId = group.moderator._id;
      delete group.moderator._id;
    }
    const moderator = {
      ...group.moderator,
      joiningDate: group.joiningDate,
    };
    res.status(200).json({ moderator });
  } catch (error) {
    next(error);
  }
};
export const getAdmins = async (req, res, next) => {
  const groupId = req.params.groupId;
  const role = req.role;

  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;

  try {
    role === groupRoles.NOT_Member ? createError(403, "Forbidden") : null;

    const aggregationResult = await Group.aggregate(
      admins(groupId, page, ITEMS_PER_PAGE)
    );

    const totalAdmins = aggregationResult[0].totalCount;

    res.status(200).json({
      admins: aggregationResult[0].admins,
      extraInfo: information(totalAdmins, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};

export const getPosts = async (req, res, next) => {
  const groupId = req.params.groupId;
  const role = req.role;
  const yourId = req.userId;
  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;
  const profilesYouBlocked = req.profilesYouBlocked;
  const blockedProfiles = req.blockedProfiles;

  try {
    role === groupRoles.NOT_Member && req.privacy === privacyGroup.PRIVATE
      ? createError(403, "Forbidden..")
      : null;

    const aggregationResult = await Post.aggregate(
      posts(
        groupId,
        blockedProfiles,
        profilesYouBlocked,
        role,
        yourId,
        page,
        ITEMS_PER_PAGE
      )
    );

    const totalPosts = aggregationResult[0].totalCount;

    res.status(200).json({
      posts: aggregationResult[0].posts,
      extraInfo: information(totalPosts, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};

//this is for admins and moderator
export const getRequestPosts = async (req, res, next) => {
  const groupId = req.params.groupId;
  const role = req.role;
  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;

  try {
    role === groupRoles.NOT_Member || role === groupRoles.MEMBER
      ? createError(403, "Forbidden")
      : null;

    const aggregationResult = await Group.aggregate(
      requestPosts(groupId, page, ITEMS_PER_PAGE)
    );

    const totalRequestPosts = aggregationResult[0].totalCount;

    res.status(200).json({
      requestPosts: aggregationResult[0].requestPosts,
      extraInfo: information(totalRequestPosts, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};
//get your requestposts
//this for members
export const getYourRequestPosts = async (req, res, next) => {
  const groupId = req.params.groupId;
  const role = req.role;
  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;
  const yourId = req.userId;
  try {
    role !== groupRoles.MEMBER ? createError(403, "Forbidden") : null;

    const aggregationResult = await Group.aggregate(
      yourRequestPost(groupId, yourId, page, ITEMS_PER_PAGE)
    );

    const totalRequestPosts = aggregationResult[0].totalCount;

    res.status(200).json({
      YourRequestPosts: aggregationResult[0].requestPosts,
      extraInfo: information(totalRequestPosts, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};

export const getJoiningRequests = async (req, res, next) => {
  const groupId = req.params.groupId;
  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;
  const role = req.role;
  const whoCanApproveMemberRequest = req.whoCanApproveMemberRequest;
  try {
    role === groupRoles.NOT_Member ||
    (role === groupRoles.MEMBER &&
      whoCanApproveMemberRequest !== "anyoneInGroup")
      ? createError(403, "Forbidden")
      : null;

    const aggregationResult = await Group.aggregate(
      joiningRequest(groupId, ITEMS_PER_PAGE, page)
    );

    const totaljoiningRequests = aggregationResult[0].totalCount;

    res.status(200).json({
      joiningRequests: aggregationResult[0].joiningRequests,
      extraInfo: information(totaljoiningRequests, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};

export const getReports = async (req, res, next) => {
  const groupId = req.params.groupId;
  const role = req.role;
  const yourId = req.userId;
  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;

  try {
    role === groupRoles.NOT_Member || role === groupRoles.MEMBER
      ? createError(403, "Forbidden")
      : null;

    const aggregationResult = await Group.aggregate(
      reports(groupId, yourId, page, ITEMS_PER_PAGE)
    );

    const totalReports = aggregationResult[0].totalCount;

    res.status(200).json({
      reports: aggregationResult[0].reports,
      extraInfo: information(totalReports, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};

export const getReportsFromAdmin = async (req, res, next) => {
  const groupId = req.params.groupId;
  const role = req.role;

  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;

  try {
    role !== groupRoles.MODERATOR ? createError(403, "Forbidden") : null;

    const aggregationResult = await Group.aggregate(
      reportsFromAdmin(groupId, page, ITEMS_PER_PAGE)
    );

    const totalReports = aggregationResult[0].totalCount;

    res.status(200).json({
      adminReports: aggregationResult[0].reports,
      extraInfo: information(totalReports, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};

export const getMembersBlocked = async (req, res, next) => {
  const groupId = req.params.groupId;
  const role = req.role;

  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;

  try {
    role === groupRoles.NOT_Member || role === groupRoles.MEMBER
      ? createError(403, "Forbidden")
      : null;
    const aggregationResult = await Group.aggregate(
      membersBlocked(groupId, page, ITEMS_PER_PAGE)
    );

    const totalMembersBlocked = aggregationResult[0].totalCount;

    res.status(200).json({
      membersBlocked: aggregationResult[0].membersBlocked,
      extraInfo: information(totalMembersBlocked, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};

export const getYourFriendsWhoDidNotJoin = async (req, res, next) => {
  const groupId = req.params.groupId;
  const role = req.role;
  const yourId = req.userId;
  const ITEMS_PER_PAGE = 1;
  const page = +req.query.page || 1;

  try {
    role === groupRoles.NOT_Member ? createError(403, "Forbidden") : null;

    const result = await User.find(
      {
        friends: { $in: yourId },
        groups: { $nin: groupId },
      },
      {
        _id: 1,
        firstName: 1,
        lastName: 1,
        logo: { $arrayElemAt: ["$profilePhotos", -1] },
      }
    )
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

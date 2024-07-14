import { deleteAssets, uploadAssets } from "../util/file.js";
import User from "../models/user.js";
import Post from "../models/post.js";
import mongoose from "mongoose";
import { fileFilterPhotosAndVideos } from "../util/file.js";
import { createError } from "../util/helpers.js";
import { validationResult } from "express-validator";
import Group from "../models/group.js";
import Page from "../models/page.js";
import {
  commentsForGroupPost,
  commentsForPagePost,
  commentsForProfilePost,
  likesForGroupPost,
  likesForPagePost,
  likesForProfilePost,
  searchInGroupPosts,
  searchInPagePosts,
  searchInProfilePosts,
} from "../util/queries/post.js";
import { information } from "../util/queries/pagination.js";
import { groupRoles, pageRoles, profileRoles } from "../util/roles.js";
import { WhoCanPostorApproveMemberRequest } from "../util/configGroup.js";
import { whoCanSee_Profile } from "../util/configProfile.js";
import { whoCanComment_Page, whoCanSee_Page } from "../util/configPage.js";
export const createPost = async (req, res, next) => {
  //for all
  const description = req.body.description;
  const assets = req.files;
  const whoCanComment = req.body.whoCanComment;
  const whoCanSee = req.body.whoCanSee;
  const yourId = req.userId;
  const errors = validationResult(req);
  //this is for page
  const pageId = req.body.pageId;
  //this is for group
  const groupId = req.body.groupId;
  const userRole = req.role;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    //check validation
    !errors.isEmpty()
      ? createError(422, "Validation failed", errors.array())
      : null;

    //check if all fields is empty
    !description && !assets
      ? createError(422, "Description and Assets are empty")
      : null;

    //get post from where
    let from;
    req.path === "/group/createPost"
      ? (from = "group")
      : req.path === "/page/createPost"
      ? (from = "page")
      : (from = "profile");
    //here if condititon true for not continue
    if (from === "group") {
      var group = await Group.findById(groupId, {
        whoCanPost: 1,
        immediatePost: 1,
      });
      group.whoCanPost ===
        WhoCanPostorApproveMemberRequest.ADMINS_AND_MODERATOR &&
      userRole === groupRoles.MEMBER
        ? createError(403, "Forbidden..")
        : null;
    }

    // upload assets to cloudinary
    //and init desc
    var publicidAndLink = [];
    let desc = "";
    let pathForCloudinary;
    from === "profile"
      ? (pathForCloudinary = `Assets_from_Profiles/${yourId}/posts`)
      : from === "page"
      ? (pathForCloudinary = `Assets_from_Pages/${pageId}/posts`)
      : (pathForCloudinary = `Assets_from_Groups/${groupId}/posts`);

    if (assets) {
      fileFilterPhotosAndVideos(assets);
      publicidAndLink = await uploadAssets(assets, pathForCloudinary);
    }

    if (description) {
      desc = description;
    }

    let post = new Post({
      description: description,
      userId: yourId,
      assets: publicidAndLink,
    });

    //continue  add field to post based on from
    if (from === "page") {
      post.page = new mongoose.Types.ObjectId(pageId);
      post.whoCanComment = whoCanComment;
      post.whoCanSee = whoCanSee;
      var result = await post.save({ session, lean: true });
      await Page.updateOne(
        { _id: pageId },
        {
          $push: { posts: result._id },
        },
        { session }
      );
    } else if (from === "profile") {
      post.profile = new mongoose.Types.ObjectId(yourId);
      post.whoCanComment = whoCanComment;
      post.whoCanSee = whoCanSee;

      var result1 = await post.save({ session });

      await User.updateOne(
        { _id: yourId },
        { $push: { posts: result1._id } },
        { session }
      );

      //for group
    } else {
      post.userRole = userRole;
      post.group = group._id;
      var result2 = await post.save({ session });
      if (group.immediatePost === false && userRole !== groupRoles.ADMIN) {
        await Group.updateOne(
          { _id: groupId },
          {
            $push: { requestPosts: { postId: result2._id, ownerId: yourId } },
          },
          { session }
        );
      } else {
        await Group.updateOne(
          { _id: groupId },
          {
            $push: { posts: result2._id },
          },
          { session }
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    //send response
    if (from === "page" || from === "profile") {
      res.status(200).json({
        message: "Your post created",
        post: `${
          from === "profile" ? JSON.stringify(result1) : JSON.stringify(result)
        }`,
      });
    } else {
      group.immediatePost === false &&
      userRole !== groupRoles.ADMIN &&
      userRole !== groupRoles.MODERATOR
        ? res.status(200).json({
            message: "Your post has forwarded to admins",
            post: result2.toObject(),
          })
        : res.status(200).json({
            message: "Your post created",
            post: JSON.stringify(result2),
          });
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    if (publicidAndLink) {
      await deleteAssets(publicidAndLink);
    }
    next(error);
  }
};

export const updatePost = async (req, res, next) => {
  //for all
  const postId = req.body.postId;
  const description = req.body.description;
  const assets = req.files;
  const deletedAssets = req.body.deletedAssets
    ? JSON.parse(req.body.deletedAssets)
    : undefined;
  const groupId = req.body.groupId;
  const pageId = req.body.pageId;
  const errors = validationResult(req);
  const yourId = req.userId;
  //for page profile
  const whoCanComment = req.body.whoCanComment;
  const whoCanSee = req.body.whoCanSee;

  try {
    //check validation
    !errors.isEmpty()
      ? createError(422, "Validation failed", errors.array())
      : null;

    //get post from where for cloudinary and check from db
    let from;
    req.path === "/group/updatePost"
      ? (from = "group")
      : req.path === "/page/updatePost"
      ? (from = "page")
      : (from = "profile");
    //get old post based on from for chcek

    const oldPost = await Post.findOne(
      {
        _id: postId,
        $or: [
          { profile: { $exists: true, $eq: yourId } },
          { group: { $exists: true, $eq: groupId } },
          { page: { $exists: true, $eq: pageId } },
        ],
      },
      { userId: 1, profile: 1, group: 1, page: 1, assets: 1, description: 1 }
    );
    //check if found
    !oldPost ? createError(404, "There are no post with This ID") : null;

    //check if you the owner
    oldPost.userId.toString() !== yourId.toString()
      ? createError(403, "Forbidden")
      : null;

    //check if all fields is empty
    !description && !assets && !deletedAssets
      ? createError(422, "Description and Assets are empty")
      : null;

    //check from deleted assets all keys right and found in db
    if (deletedAssets) {
      for (let i = 0; i < deletedAssets.length; i++) {
        if (
          "public_id" in deletedAssets[i] &&
          "resource_type" in deletedAssets[i]
        ) {
          continue;
        } else {
          createError(404, "Some missing key in assets you want delete");
        }
      }
      for (let i = 0; i < deletedAssets.length; i++) {
        const public_id = deletedAssets[i].public_id;
        const found = oldPost.assets.some((obj) => obj.public_id === public_id);

        if (found) {
          continue;
        } else {
          createError(422, "Wrong in public id");
        }
      }
    }

    //upload new assets
    let pathForCloudinary;
    from === "profile"
      ? (pathForCloudinary = `Assets_from_Profiles/${oldPost.profile}/posts`)
      : from === "page"
      ? (pathForCloudinary = `Assets_from_Pages/${oldPost.page}/posts`)
      : (pathForCloudinary = `Assets_from_Groups/${oldPost.group}/posts`);

    var publicidAndLink; // for new assets
    if (assets) {
      fileFilterPhotosAndVideos(assets);
      publicidAndLink = await uploadAssets(assets, pathForCloudinary);
    }

    //if user want delete assets //just delete from db for if something happen
    var assetsAfterDelete = [];
    if (deletedAssets) {
      assetsAfterDelete = oldPost.assets.filter((pi) => {
        return !deletedAssets.some((piD) => pi.public_id === piD.public_id);
      });
    }
    //the new assets
    let newAssets;
    if (deletedAssets) {
      newAssets = [...assetsAfterDelete, ...publicidAndLink];
    } else {
      newAssets = [...oldPost.assets, ...publicidAndLink];
    }

    oldPost.description = description;
    oldPost.assets = newAssets;
    if (from === "page" || from === "profile") {
      oldPost.whoCanSee = whoCanSee;
      oldPost.whoCanComment = whoCanComment;
    }
    //update db
    let done = 0;
    await oldPost.save();
    done = 1;
    //delete assets if all things is ok
    if (deletedAssets && done) {
      await deleteAssets(deletedAssets);
    }
    res.status(200).json({ message: "Post was updated", post: oldPost });
  } catch (error) {
    if (publicidAndLink) {
      await deleteAssets(publicidAndLink);
    }
    next(error);
  }
};

export const deletePost = async (req, res, next) => {
  //for all
  const postId = req.body.postId;
  const errors = validationResult(req);
  const yourId = req.userId;
  const role = req.role; //this is come for group
  const session = await mongoose.startSession();
  session.startTransaction();
  const groupId = req.body.groupId;
  const pageId = req.body.pageId;
  try {
    //check validation
    !errors.isEmpty()
      ? createError(422, "Validation failed", errors.array())
      : null;
    //get post from where for cloudinary and check from db
    let from;
    req.path === "/group/deletePost"
      ? (from = "group")
      : req.path === "/page/deletePost"
      ? (from = "page")
      : (from = "profile");
    //get old post
    const oldPost = await Post.findOne(
      {
        _id: postId,
        $or: [
          { profile: { $exists: true, $eq: yourId } },
          { group: { $exists: true, $eq: groupId } },
          { page: { $exists: true, $eq: pageId } },
        ],
      },
      {
        userId: 1,
        profile: 1,
        group: 1,
        page: 1,
        assets: 1,
        description: 1,
        userRole: 1,
      }
    );
    //check if found
    !oldPost ? createError(404, "There are no post with This ID") : null;
    //check if you can delete
    //first condition for page and profile
    ///second for group

    //if you arrive here you can delete for page and profile
    var canDelete = false;

    const areYouOwner = oldPost.userId.toString() === yourId.toString();

    if (from === "page" || from === "profile") {
      canDelete = true;
    } else {
      (role === groupRoles.ADMIN && oldPost.userRole === groupRoles.MEMBER) ||
      role === groupRoles.MODERATOR ||
      areYouOwner
        ? (canDelete = true)
        : null;
    }
    !canDelete ? createError(403, "Forbidden..") : null;
    //extract assets for delete from cloudianry
    let extractedAssets = [];
    extractedAssets = oldPost.assets;
    //edit db
    let done = 0;
    await Post.deleteOne({ _id: postId }, { session });

    if (from === "page") {
      await Page.updateOne(
        { _id: pageId },
        {
          $pull: { posts: new mongoose.Types.ObjectId(postId) },
        },
        {
          session,
        }
      );
    } else if (from === "profile") {
      await User.updateOne(
        { _id: yourId },
        {
          $pull: { posts: postId },
        },
        { session }
      );
    } else {
      await Group.updateOne(
        { _id: oldPost.group },
        {
          $pull: { posts: { postId: new mongoose.Types.ObjectId(postId) } },
        },
        {
          session,
        }
      );
    }
    done = 1;
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Post was Deleted" });

    //delete assets
    if (extractedAssets.length > 0 && done === 1) {
      await deleteAssets(extractedAssets);
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const likePost = async (req, res, next) => {
  //for all
  const postId = req.body.postId;
  const yourId = req.userId;
  const pageId = req.body.pageId;
  const groupId = req.body.groupId;
  const profileId = req.body.profileId;
  const role = req.role;

  try {
    //get post from where f check from db
    let from;
    req.path === "/group/likePost"
      ? (from = "group")
      : req.path === "/page/likePost"
      ? (from = "page")
      : (from = "profile");

    if (from === "profile") {
      if (role === profileRoles.NOT_FRIENDS) {
        const post = await Post.findOne(
          {
            _id: postId,
            profile: profileId,
          },
          {
            whoCanComment: 1,
            whoCanSee: 1,
          }
        );
        !post ? createError(404, " Did not find the post") : null;

        post.whoCanSee === whoCanSee_Profile.FRIENDS
          ? createError(403, "Forbidden")
          : null;
        post.whoCanComment === whoCanSee_Profile.FRIENDS
          ? createError(403, "Forbidden")
          : null;
      }
    }
    if (from === "page") {
      if (role === pageRoles.NOT_FOLLOWERS) {
        //get post
        const post = await Post.findOne(
          {
            _id: postId,
            page: pageId,
          },
          {
            whoCanComment: 1,
            whoCanSee: 1,
          }
        );
        !post ? createError(404, " Did not find the post") : null;

        post.whoCanSee === whoCanSee_Page.FOLLOWERS
          ? createError(403, "Forbidden")
          : null;
        post.whoCanComment === whoCanComment_Page.FOLLOWERS
          ? createError(403, "Forbidden")
          : null;
      }
    }
    const like = await Post.findOneAndUpdate(
      {
        _id: postId,
        $or: [
          { profile: { $exists: true, $eq: profileId } },
          { group: { $exists: true, $eq: groupId } },
          { page: { $exists: true, $eq: pageId } },
        ],
        likes: { $nin: yourId },
      },
      {
        $push: { likes: new mongoose.Types.ObjectId(yourId) },
      },
      {
        new: true,
        select: "_id",
      }
    );

    !like ? createError(400, "You Like Before Or did not find the post") : null;
    res.status(200).json({ message: "like" });
  } catch (error) {
    next(error);
  }
};
export const unlikePost = async (req, res, next) => {
  //for all
  const postId = req.body.postId;
  const yourId = req.userId;
  const pageId = req.body.pageId;
  const groupId = req.body.groupId;
  const profileId = req.body.profileId;
  const role = req.role;
  try {
    //get post from where f check from db
    let from;
    req.path === "/group/unlikePost"
      ? (from = "group")
      : req.path === "/page/unlikePost"
      ? (from = "page")
      : (from = "profile");

    if (from === "profile") {
      if (role === profileRoles.NOT_FRIENDS) {
        const post = await Post.findOne(
          {
            _id: postId,
            profile: profileId,
          },
          {
            whoCanComment: 1,
            whoCanSee: 1,
          }
        );
        !post ? createError(404, " Did not find the post") : null;

        post.whoCanSee === whoCanSee_Profile.FRIENDS
          ? createError(403, "Forbidden")
          : null;
        post.whoCanComment === whoCanSee_Profile.FRIENDS
          ? createError(403, "Forbidden")
          : null;
      }
    }
    if (from === "page") {
      if (role === pageRoles.NOT_FOLLOWERS) {
        //get post
        const post = await Post.findOne(
          {
            _id: postId,
            page: pageId,
          },
          {
            whoCanComment: 1,
            whoCanSee: 1,
          }
        );
        !post ? createError(404, " Did not find the post") : null;

        post.whoCanSee === whoCanSee_Page.FOLLOWERS
          ? createError(403, "Forbidden")
          : null;
        post.whoCanComment === whoCanComment_Page.FOLLOWERS
          ? createError(403, "Forbidden")
          : null;
      }
    }

    const unlike = await Post.findOneAndUpdate(
      {
        _id: postId,
        $or: [
          { profile: { $exists: true, $eq: profileId } },
          { group: { $exists: true, $eq: groupId } },
          { page: { $exists: true, $eq: pageId } },
        ],
        likes: { $in: yourId },
      },
      {
        $pull: { likes: new mongoose.Types.ObjectId(yourId) },
      },
      {
        new: true,
        select: "_id",
      }
    );

    !unlike
      ? createError(400, "You did  not like  Before Or did not find the post")
      : null;
    res.status(200).json({ message: "unlike" });
  } catch (error) {
    next(error);
  }
};

export const createComment = async (req, res, next) => {
  const postId = req.body.postId;

  const description = req.body.description;
  const assets = req.files;
  const role = req.role;
  const yourId = req.userId;
  const pageId = req.body.pageId;
  const groupId = req.body.groupId;
  const profileId = req.body.profileId;

  try {
    //Check the Fields
    (!description || description === "") && (!assets || assets.length === 0)
      ? createError(422, "Desciption and assets all of them are empty")
      : null;

    let from;
    req.path === "/group/createComment"
      ? (from = "group")
      : req.path === "/page/createComment"
      ? (from = "page")
      : (from = "profile");

    if (from === "profile") {
      if (role === profileRoles.NOT_FRIENDS) {
        const post = await Post.findOne(
          {
            _id: postId,
            profile: profileId,
          },
          {
            whoCanComment: 1,
            whoCanSee: 1,
          }
        );
        !post ? createError(404, " Did not find the post") : null;

        post.whoCanSee === whoCanSee_Profile.FRIENDS
          ? createError(403, "Forbidden")
          : null;
        post.whoCanComment === whoCanSee_Profile.FRIENDS
          ? createError(403, "Forbidden")
          : null;
      }
    }

    if (from === "page") {
      if (role === pageRoles.NOT_FOLLOWERS) {
        //get post
        const post = await Post.findOne(
          {
            _id: postId,
            page: pageId,
          },
          {
            whoCanComment: 1,
            whoCanSee: 1,
          }
        );
        !post ? createError(404, " Did not find the post") : null;

        post.whoCanSee === whoCanSee_Page.FOLLOWERS
          ? createError(403, "Forbidden")
          : null;
        post.whoCanComment === whoCanComment_Page.FOLLOWERS
          ? createError(403, "Forbidden")
          : null;
      }
    }

    var publicidAndLink = [];
    let desc = "";

    //Upload assets
    let pathForCloudinary;
    from === "profile"
      ? (pathForCloudinary = `Assets_from_Profiles/${req.ownerPost}/posts`)
      : from === "page"
      ? (pathForCloudinary = `Assets_from_Pages/${req.ownerPost}/posts`)
      : (pathForCloudinary = `Assets_from_Groups/${req.ownerPost}/posts`);
    if (assets) {
      fileFilterPhotosAndVideos(assets);
      publicidAndLink = await uploadAssets(assets, pathForCloudinary);
    }
    //add desc
    description ? (desc = description) : null;

    let comment = {
      userId: yourId,
      description: description,
      assets: publicidAndLink,
      createdAt: new Date(),
    };

    if (from === "group") {
      comment.role = role;
    }
    //save changes
    var done = 0;

    const post = await Post.findOneAndUpdate(
      {
        _id: postId,
        $or: [
          { profile: { $exists: true, $eq: profileId } },
          { group: { $exists: true, $eq: groupId } },
          { page: { $exists: true, $eq: pageId } },
        ],
      },
      {
        $push: { comments: comment },
      },
      {
        new: true,
        select: "_id comments",
      }
    );
    !post ? createError(404, "did not find the post") : null;
    done = 1;

    const newComment = post.comments[post.comments.length - 1];
    res
      .status(200)
      .json({ message: "Your comment has been created", comment: newComment });
  } catch (error) {
    //if something happen delete assets you uploaded
    if (publicidAndLink && done === 0) {
      await deleteAssets(publicidAndLink);
    }
    next(error);
  }
};

export const updateComment = async (req, res, next) => {
  const postId = req.body.postId;
  const _commentId = req.body._commentId;
  const role = req.role;
  const yourId = req.userId;
  const pageId = req.body.pageId;
  const groupId = req.body.groupId;
  const profileId = req.body.profileId;
  const description = req.body.description;
  const deletedAssets = req.body.deletedAssets
    ? JSON.parse(req.body.deletedAssets)
    : undefined;
  const assets = req.files;

  try {
    // return res.json({ 'aa': req.body });
    let from;
    req.path === "/group/updateComment"
      ? (from = "group")
      : req.path === "/page/updateComment"
      ? (from = "page")
      : (from = "profile");

    //get post with old comment
    const post = await Post.findOne(
      {
        _id: new mongoose.Types.ObjectId(postId),
        $or: [
          { profile: { $exists: true, $eq: profileId } },
          { group: { $exists: true, $eq: groupId } },
          { page: { $exists: true, $eq: pageId } },
        ],
      },
      {
        userId: 1,
        comments: {
          $filter: {
            input: "$comments",
            as: "comment",
            cond: {
              $eq: ["$$comment._id", new mongoose.Types.ObjectId(_commentId)],
            },
          },
        },
        whoCanComment: 1,
        whoCanSee: 1,
      }
    );

    !post ? createError(404, "There are no post with this Id") : null;
    if (from === "profile") {
      if (role === profileRoles.NOT_FRIENDS) {
        post.whoCanSee === whoCanSee_Profile.FRIENDS
          ? createError(403, "Forbidden")
          : null;
      }
    }

    if (from === "page") {
      if (role === pageRoles.NOT_FOLLOWERS) {
        post.whoCanSee === whoCanSee_Page.FOLLOWERS
          ? createError(403, "Forbidden")
          : null;
      }
    }

    //extract comment
    const comment = post.comments[0];

    //check if found
    !comment ? createError(404, "There are no comment With This ID") : null;
    //are you owner the comment
    const areYouOwner = comment.userId.toString() === yourId.toString();
    !areYouOwner ? createError(403, "Forbidden") : null;
    //Check the Fields
    !description && !assets && !deletedAssets
      ? createError(422, "Desciption and assets all of them are empty")
      : null;

    //check from asset user want delete is true syntex and found in db
    if (deletedAssets) {
      for (let i = 0; i < deletedAssets.length; i++) {
        console.log(deletedAssets[i]);
        if (
          "public_id" in deletedAssets[i] &&
          "resource_type" in deletedAssets[i]
        ) {
          continue;
        } else {
          createError(404, "Some missing key in assets you want delete");
        }
      }
      for (let i = 0; i < deletedAssets.length; i++) {
        const public_id = deletedAssets[i].public_id;
        const found = comment.assets.some((obj) => obj.public_id === public_id);

        if (found) {
          continue;
        } else {
          createError(422, "Wrong in public id");
        }
      }
    }
    //upload new assets
    let pathForCloudinary;
    from === "profile"
      ? (pathForCloudinary = `Assets_from_Profiles/${req.ownerPost}/posts`)
      : from === "page"
      ? (pathForCloudinary = `Assets_from_Pages/${req.ownerPost}/posts`)
      : (pathForCloudinary = `Assets_from_Groups/${req.ownerPost}/posts`);
    var publicidAndLink = [];
    if (assets) {
      fileFilterPhotosAndVideos(assets);
      publicidAndLink = await uploadAssets(assets, pathForCloudinary);
    }
    //if user want delete assets //just delete from db for if something happen
    var assetsAfterDelete = [];
    if (deletedAssets) {
      assetsAfterDelete = comment.assets.filter((pi) => {
        return !deletedAssets.some((piD) => pi.public_id === piD.public_id);
      });
    }
    //delete before asset from db and add new assets
    let newAssets;
    if (deletedAssets) {
      newAssets = [...assetsAfterDelete, ...publicidAndLink];
    } else {
      newAssets = [...comment.assets, ...publicidAndLink];
    }

    //add new desc and new asset to db

    post.comments[0].description = description;
    post.comments[0].assets = newAssets;

    var done = 0;
    await Post.updateOne(
      {
        _id: new mongoose.Types.ObjectId(postId),
        "comments._id": new mongoose.Types.ObjectId(_commentId),
      },
      {
        $set: {
          "comments.$.description": description,
          "comments.$.assets": newAssets,
        },
      }
    );
    done = 1;

    res.status(200).json({ message: "Post was updated", comment });
    //delete asset from cloudinary
    if (deletedAssets && done === 1) {
      await deleteAssets(deletedAssets);
    }
    //send response
  } catch (error) {
    // if something happen delete new assets from cloudinary
    if (publicidAndLink && done === 0) {
      await deleteAssets(publicidAndLink);
    }
    next(error);
  }
};

export const deleteComment = async (req, res, next) => {
  const postId = req.body.postId;
  const _commentId = req.body._commentId;
  const role = req.role;
  const yourId = req.userId;
  const pageId = req.body.pageId;
  const groupId = req.body.groupId;
  const profileId = req.body.profileId;
  try {
    let from;
    req.path === "/group/deleteComment"
      ? (from = "group")
      : req.path === "/page/deleteComment"
      ? (from = "page")
      : (from = "profile");
    //get post with old comment
    const post = await Post.findOne(
      {
        _id: new mongoose.Types.ObjectId(postId),
        $or: [
          { profile: { $exists: true, $eq: profileId } },
          { group: { $exists: true, $eq: groupId } },
          { page: { $exists: true, $eq: pageId } },
        ],
      },
      {
        userId: 1,
        comments: {
          $filter: {
            input: "$comments",
            as: "comment",
            cond: {
              $eq: ["$$comment._id", new mongoose.Types.ObjectId(_commentId)],
            },
          },
        },
      }
    );
    !post ? createError(404, "There are no post with this Id") : null;

    if (from === "profile") {
      if (role === profileRoles.NOT_FRIENDS) {
        post.whoCanSee === whoCanSee_Profile.FRIENDS
          ? createError(403, "Forbidden")
          : null;
      }
    }

    if (from === "page") {
      if (role === pageRoles.NOT_FOLLOWERS) {
        post.whoCanSee === whoCanSee_Page.FOLLOWERS
          ? createError(403, "Forbidden")
          : null;
      }
    }
    //extract comment
    const comment = post.comments[0];

    //check if found
    !comment ? createError(404, "There are no comment With This ID") : null;
    //are you owner the comment
    const areYouOwner = comment.userId.toString() === yourId.toString();

    //here we will check if the post come from group or page or profile
    //because if post from group condition will change
    var canDelete = false;

    if (from === "profile") {
      areYouOwner || role === profileRoles.OWNER ? (canDelete = true) : null;
    }
    if (from === "page") {
      console.log(role);
      areYouOwner || role === pageRoles.MODERATOR ? (canDelete = true) : null;
    }
    if (from === "group") {
      (role === groupRoles.ADMIN && comment.userRole === groupRoles.MEMBER) ||
      role === groupRoles.MODERATOR ||
      areYouOwner
        ? (canDelete = true)
        : null;
    }

    //check if can delete
    !canDelete ? createError(403, "Forbidden...") : null;
    //here you can delete
    //extract asset for delete from cloudinary
    const extractedAssets = comment.assets;
    var done = 0;
    //delete comment
    await Post.updateOne(
      { _id: postId },
      {
        $pull: { comments: { _id: _commentId } },
      }
    );
    done = 1;
    //delete assets
    if (extractedAssets.length > 0 && done === 1) {
      await deleteAssets(extractedAssets);
    }
    //send response
    res.status(200).json({ message: "comment has been Deleted" });
  } catch (error) {
    next(error);
  }
};

export const getComments = async (req, res, next) => {
  //for all
  const postId = req.params.postId;
  const profileId = req.params.profileId;
  const pageId = req.params.pageId;
  const groupId = req.params.groupId;
  const yourId = req.userId;
  const role = req.role;

  //for all
  const profilesYouBlocked = req.profilesYouBlocked;
  const blockedProfiles = req.blockedProfiles;
  //for all
  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;

  try {
    let from;
    req.path === `/group/comments/${groupId}/${postId}`
      ? (from = "group")
      : req.path === `/page/comments/${pageId}/${postId}`
      ? (from = "page")
      : (from = "profile");

    if (from === "profile") {
      const post = await Post.findOne(
        { _id: postId, profile: profileId },
        { whoCanSee: 1 }
      );
      !post ? createError(404, "There is no post with this ID") : null;

      post.whoCanSee === whoCanSee_Profile.FRIENDS &&
      role === profileRoles.NOT_FRIENDS
        ? createError(403, "Forbidden")
        : null;

      const aggregationResult = await Post.aggregate(
        commentsForProfilePost(
          postId,
          role,
          blockedProfiles,
          profilesYouBlocked,
          page,
          ITEMS_PER_PAGE,
          yourId
        )
      );

      const totalCount = aggregationResult[0].commentsCount;

      return res.json({
        comments: aggregationResult[0].comments,
        extraInfo: information(totalCount, page, ITEMS_PER_PAGE),
      });
    } else if (from === "page") {
      const post = await Post.findOne(
        { _id: postId, page: pageId },
        { whoCanSee: 1 }
      );
      !post ? createError(404, "There is no post with this ID") : null;

      post.whoCanSee === whoCanSee_Page.FOLLOWERS &&
      role === pageRoles.NOT_FOLLOWERS
        ? createError(403, "Forbidden")
        : null;
      const aggregationResult = await Post.aggregate(
        commentsForPagePost(
          postId,
          role,
          blockedProfiles,
          profilesYouBlocked,
          page,
          ITEMS_PER_PAGE,
          yourId
        )
      );

      const totalCount = aggregationResult[0].commentsCount;

      return res.json({
        comments: aggregationResult[0].comments,
        extraInfo: information(totalCount, page, ITEMS_PER_PAGE),
      });
    } else if (from === "group") {
      role === groupRoles.NOT_Member && req.privacy === privacy.PRIVATE
        ? createError(403, "Forbidden..")
        : null;

      const post = await Post.findOne(
        { _id: postId, group: groupId },
        { _id: 1 }
      );
      !post ? createError(404, "There are no post with this ID") : null;
      const aggregationResult = await Post.aggregate(
        commentsForGroupPost(
          postId,
          role,
          blockedProfiles,
          profilesYouBlocked,
          page,
          ITEMS_PER_PAGE,
          yourId
        )
      );

      const totalCount = aggregationResult[0].commentsCount;

      return res.json({
        comments: aggregationResult[0].comments,
        extraInfo: information(totalCount, page, ITEMS_PER_PAGE),
      });
    } else {
      createError(403, "Forbidden.....");
    }
  } catch (error) {
    next(error);
  }
};

export const getLikes = async (req, res, next) => {
  //for all
  const postId = req.params.postId;
  const profileId = req.params.profileId;
  const pageId = req.params.pageId;
  const groupId = req.params.groupId;
  const yourId = req.userId;
  const role = req.role;

  //for all
  const profilesYouBlocked = req.profilesYouBlocked;
  const blockedProfiles = req.blockedProfiles;
  //for all
  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;

  try {
    let from;
    req.path === `/group/likes/${groupId}/${postId}`
      ? (from = "group")
      : req.path === `/page/likes/${pageId}/${postId}`
      ? (from = "page")
      : (from = "profile");

    if (from === "profile") {
      const post = await Post.findOne(
        { _id: postId, profile: profileId },
        { whoCanSee: 1 }
      );
      !post ? createError(404, "There is no post with this ID") : null;

      post.whoCanSee === whoCanSee_Profile.FRIENDS &&
      role === profileRoles.NOT_FRIENDS
        ? createError(403, "Forbidden")
        : null;

      const aggregationResult = await Post.aggregate(
        likesForProfilePost(
          postId,
          role,
          blockedProfiles,
          profilesYouBlocked,
          yourId,
          page,
          ITEMS_PER_PAGE
        )
      );

      const totalCount = aggregationResult[0].likesCount;

      return res.json({
        likes: aggregationResult[0].likes,
        extraInfo: information(totalCount, page, ITEMS_PER_PAGE),
      });
    } else if (from === "page") {
      const post = await Post.findOne(
        { _id: postId, page: pageId },
        { whoCanSee: 1 }
      );
      !post ? createError(404, "There is no post with this ID") : null;

      post.whoCanSee === whoCanSee_Page.FOLLOWERS &&
      role === pageRoles.NOT_FOLLOWERS
        ? createError(403, "Forbidden")
        : null;
      const aggregationResult = await Post.aggregate(
        likesForPagePost(
          postId,
          role,
          blockedProfiles,
          profilesYouBlocked,
          yourId,
          page,
          ITEMS_PER_PAGE
        )
      );
      const totalCount = aggregationResult[0].likesCount;

      return res.json({
        likes: aggregationResult[0].likes,
        extraInfo: information(totalCount, page, ITEMS_PER_PAGE),
      });
    } else if (from === "group") {
      role === groupRoles.NOT_Member && req.privacy === privacy.PRIVATE
        ? createError(403, "Forbidden..")
        : null;

      const post = await Post.findOne(
        { _id: postId, group: groupId },
        { _id: 1 }
      );
      !post ? createError(404, "There are no post with this ID") : null;
      const aggregationResult = await Post.aggregate(
        likesForGroupPost(
          postId,
          role,
          blockedProfiles,
          profilesYouBlocked,
          yourId,
          page,
          ITEMS_PER_PAGE
        )
      );

      const totalCount = aggregationResult[0].likesCount;

      return res.json({
        likes: aggregationResult[0].likes,
        extraInfo: information(totalCount, page, ITEMS_PER_PAGE),
      });
    } else {
      createError(403, "Forbidden.....");
    }
  } catch (error) {
    next(error);
  }
};

export const searchInPosts = async (req, res, next) => {
  //for all

  const profileId = req.params.profileId;
  const pageId = req.params.pageId;
  const groupId = req.params.groupId;
  const yourId = req.userId;
  const role = req.role;
  //for all
  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;
  const word = req.query.word || "";
  const profilesYouBlocked = req.profilesYouBlocked;
  const blockedProfiles = req.blockedProfiles;

  try {
    word.toString().length < 3
      ? createError(422, "Should be with length 3 and up ")
      : null;
    let from;
    req.path === `/group/search/${groupId}`
      ? (from = "group")
      : req.path === `/page/search/${pageId}`
      ? (from = "page")
      : (from = "profile");
    console.log(from);

    if (from === "profile") {
      const aggregationResult = await Post.aggregate(
        searchInProfilePosts(
          profileId,
          role,
          page,
          ITEMS_PER_PAGE,
          yourId,
          word
        )
      );

      const totalPosts = aggregationResult[0].totalCount;

      //role mean are you owner of posts or not for edit or delete
      res.status(200).json({
        role: role,
        posts: aggregationResult[0].posts,
        extraInfo: information(totalPosts, page, ITEMS_PER_PAGE),
      });
    } else if (from === "page") {
      const aggregationResult = await Post.aggregate(
        searchInPagePosts(pageId, role, page, ITEMS_PER_PAGE, word)
      );
      const totalPosts = aggregationResult[0].totalCount;

      res.status(200).json({
        role: role,
        posts: aggregationResult[0].posts,
        extraInfo: information(totalPosts, page, ITEMS_PER_PAGE),
      });
    } else {
      role === groupRoles.NOT_Member && req.privacy === privacy.PRIVATE
        ? createError(403, "Forbidden..")
        : null;

      const aggregationResult = await Post.aggregate(
        searchInGroupPosts(
          groupId,
          role,
          blockedProfiles,
          profilesYouBlocked,
          page,
          ITEMS_PER_PAGE,
          yourId,
          word
        )
      );

      const totalPosts = aggregationResult[0].totalCount;

      res.status(200).json({
        posts: aggregationResult[0].posts,
        extraInfo: information(totalPosts, page, ITEMS_PER_PAGE),
      });
    }
  } catch (error) {
    next(error);
  }
};

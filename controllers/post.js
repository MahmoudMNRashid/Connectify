import { deleteAssets, uploadAssets } from "../util/file.js";
import User from "../models/user.js";
import Post from "../models/post.js";
import mongoose from "mongoose";
import { hostOnline } from "../util/connect.js";
import { fileFilterPhotosAndVideos } from "../util/file.js";

export const createPostFromProfile = async (req, res, next) => {
  const description = req.body.description;
  const assets = req.files;
  try {
    const user = await User.findOne({ _id: req.userId });
    if (!user) {
      const error = new Error("Not auth");
      error.statusCode = 401;
      throw error;
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
      publicidAndLink = await uploadAssets(assets,"Assets from profile");
      console.log(publicidAndLink);
    }
    if (description) {
      desc = description;
    }

    const post = new Post({
      description: desc,
      userId: new mongoose.Types.ObjectId(req.userId),
      assets: publicidAndLink,
      profile: user._id,
    });
    const result = await post.save();
    user.posts.push(result._id);
    await user.save();

    result.link = hostOnline + "/profile" + "/" + result._id.toString() ,
      await result.save();
    res.status(201).json({ message: "Post was created", post: result });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const updatePostFromProfile = async (req, res, next) => {
  //extract data
  const description = req.body.description;
  const deletedAssets = req.body.deletedAssets;
  const assets = req.files;
  const idPost = req.body.idPost;

  try {
    //check user if found
    const user = await User.findOne({ _id: req.userId });
    if (!user) {
      const error = new Error("Not Auth");
      error.statusCode = 401;
      throw error;
    }
    if (!description && !assets) {
      const error = new Error("All fields is empty");
      error.statusCode = 400;
      throw error;
    }
    //check post if found from user doc
    const isPostFound = user.postsincludes(
      new mongoose.Types.ObjectId(idPost)
    );

    if (!isPostFound) {
      const error = new Error("You can not update this post");
      error.statusCode = 403;
      throw error;
    }
    //check post if found from post doc
    const post = await Post.findOne({ _id: idPost });
    if (!post) {
      const error = new Error("Post not found");
      error.statusCode = 404;
      throw error;
    }
    if (post.userId.toString() !== req.userId) {
      const error = new Error("You can not update this post.");
      error.statusCode = 403;
      throw error;
    }

    //Here you can start update
    let publicidAndLink = [];

    //if user upload new asset
    if (assets) {
      fileFilterPhotosAndVideos(assets);

      publicidAndLink = await uploadAssets(assets,"Assets from profile");
    }
    let assetsAfterDelete = [];

    //delete old asset if found from db and cloudinary
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
      await deleteAssets(deletedAssets);

      assetsAfterDelete = post.assets.filter((pi) => {
        return !deletedAssets.some((piD) => pi.public_id === piD.public_id);
      });
    }

    //update post in db
    const newAssets = [...assetsAfterDelete, ...publicidAndLink];
    console.log(newAssets);
    post.description = description;
    post.assets = newAssets;
    const result = await post.save();
    res.status(200).json({ message: "Post was updated", post: result });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const deletePostFromProfile = async (req, res, next) => {
  const idPost = req.body.idPost;
  try {
    const user = await User.findOne({ _id: req.userId });
    if (!user) {
      const error = new Error("Not auth");
      error.statusCode = 401;
      throw error;
    }
    if (!idPost) {
      const error = new Error("Did not found idPost ");
      error.statusCode = 404;
      throw error;
    }

    const idPostFromUserDoc = user.postsfromProfile.includes(
      new mongoose.Types.ObjectId(idPost)
    );
    if (!idPostFromUserDoc) {
      const error = new Error("Post not found");
      error.statusCode = 404;
      throw error;
    }
    const idPostFromPostDoc = Post.findById({
      _id: new mongoose.Types.ObjectId(idPost),
    });
    if (!idPostFromPostDoc) {
      const error = new Error("Post not found");
      error.statusCode = 404;
      throw error;
    }
    //now you can delete
    await Post.findByIdAndDelete(idPost);
    user.postsfromProfile.pull(idPost);
    await user.save();
    res.status(200).json({ message: "Post was deleted" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

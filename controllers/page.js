import { validationResult } from "express-validator";
import mongoose from "mongoose";

import User from "../models/user.js";
import Post from "../models/post.js";
import Page from "../models/page.js";

import { createError } from "../util/helpers.js";
import {
  deleteAssets,
  fileFilterPhotosAndVideos,
  uploadAssets,
} from "../util/file.js";
import { followers, posts, rates, usersBlocked } from "../util/queries/page.js";
import { information } from "../util/queries/pagination.js";


export const createPage = async (req, res, next) => {
  const yourId = req.userId;
  const name = req.body.name;
  const categories = req.body.categories;
  const errors = validationResult(req);
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // if validation failed
    if (!errors.isEmpty()) {
      createError(422, "Validation failed", errors.array());
    }
    //if you have page with this name

    const oldPage = await Page.findOne({ owner: yourId, name: name });

    oldPage ? createError(400, "You already  own a page with this name") : null;

    //here you can create page
    //create new page schema
    const newPage = new Page({ name, categories, owner: yourId });
    //save page in pages collectioin
    const result = await newPage.save({ session });
    //save in users Collection
    await User.updateOne(
      { _id: yourId },
      { $push: { ownedPage: result._id } },
      { session },
      {
        session,
      }
    );
    await session.commitTransaction();
    session.endSession();
    //send response
    res.status(201).json({ message: "Page was created", result: result });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
export const addCover = async (req, res, next) => {
  const cover = req.files;
  const pageId = req.body.pageId;

  try {
    //check Validation and Filter
    cover.length !== 1 ? createError(422, "Please upload one photo") : null;
    fileFilterPhotosAndVideos(cover);

    //Get page with cover
    const page = await Page.findOne(
      { _id: pageId, cover: { $exists: false } },
      { cover: 1 }
    );

    //Check if you already added one
    !page ? createError("400", "There is a previous cover") : null;

    //Upload cover to cloudinary
    var publicID_Link = [];
    publicID_Link = await uploadAssets(
      cover,
      `Assets_from_Pages/${page._id}-${page.name}/cover`
    );
    //save change in db
    page.cover = publicID_Link[0];
    await page.save();

    res.status(200).json({ message: "Cover  was added ", link: publicID_Link });
  } catch (error) {
    if (publicID_Link) {
      await deleteAssets();
    }
    next(error);
  }
};
export const updateCover = async (req, res, next) => {
  const cover = req.files;
  const pageId = req.body.pageId;

  try {
    //check if uploaded more than one photo
    cover.length !== 1 ? createError(422, "Please upload one photo") : null;

    // Filter photo (for example if he upload pdf file)
    fileFilterPhotosAndVideos(cover);

    //Get page with old cover
    const page = await Page.findOne(
      { _id: pageId, cover: { $exists: true } },
      { cover: 1 }
    );

    //Check if you not added one
    !page ? createError("400", "There is no previous cover") : null;

    //Upload cover to cloudinary
    var publicID_Link = [];
    publicID_Link = await uploadAssets(
      cover,
      `Assets_from_Pages/${page._id}-${page.name}/cover`
    );
    //extract old cover
    const oldCover = page.cover;
    //Update db and temp for ensure we save changes in db and now can delete cover from cloudinary
    page.cover == publicID_Link[0];
    var temp = 0;
    await page.save();
    temp = 1;
    //send response
    res.status(200).json({ message: "Cover was updated", link: publicID_Link });

    //delete old cover from cloudinary
    temp ? await deleteAssets([oldCover]) : null;
  } catch (error) {
    if (temp === 0) {
      if (publicID_Link) {
        await deleteAssets(publicID_Link);
      }
    }
    next(error);
  }
};

export const addLogo = async (req, res, next) => {
  const logo = req.files;
  const pageId = req.body.pageId;

  try {
    //check Validation and Filter
    logo.length !== 1 ? createError(422, "Please upload one photo") : null;
    fileFilterPhotosAndVideos(logo);

    //Get page with logo
    const page = await Page.findOne(
      { _id: pageId, logo: { $exists: false } },
      { logo: 1 }
    );

    //Check if you already added one
    !page ? createError("400", "There is a previous logo") : null;

    //Upload logo to cloudinary
    var publicID_Link = [];
    publicID_Link = await uploadAssets(
      logo,
      `Assets_from_Pages/${page._id}-${page.name}/logo`
    );
    //save change in db
    page.logo = publicID_Link[0];
    await page.save();

    res.status(200).json({ message: "Logo  was added ", link: publicID_Link });
  } catch (error) {
    if (publicID_Link) {
      await deleteAssets();
    }
    next(error);
  }
};
export const updateLogo = async (req, res, next) => {
  const logo = req.files;
  const pageId = req.body.pageId;

  try {
    //check if uploaded more than one photo
    logo.length !== 1 ? createError(422, "Please upload one photo") : null;

    // Filter photo (for example if he upload pdf file)
    fileFilterPhotosAndVideos(logo);

    //Get page with old logo
    const page = await Page.findOne(
      { _id: pageId, logo: { $exists: true } },
      { logo: 1 }
    );

    //Check if you not added one
    !page ? createError("400", "There is no previous logo") : null;

    //Upload logo to cloudinary
    var publicID_Link = [];
    publicID_Link = await uploadAssets(
      logo,
      `Assets_from_Pages/${page._id}-${page.name}/logo`
    );
    //extract old logo
    const oldLogo = page.logo;
    //Update db and temp for ensure we save changes in db and now can delete cover from cloudinary
    page.logo == publicID_Link[0];
    var temp = 0;
    await page.save();
    temp = 1;
    //send response
    res.status(200).json({ message: "Logo was updated", link: publicID_Link });

    //delete old logo from cloudinary
    temp ? await deleteAssets([oldLogo]) : null;
  } catch (error) {
    if (temp === 0) {
      if (publicID_Link) {
        await deleteAssets(publicID_Link);
      }
    }
    next(error);
  }
};
export const addBio = async (req, res, next) => {
  const pageId = req.body.pageId;
  const bio = req.body.bio;

  try {
    //check Validation
    bio.length === 0 ? createError(422, "Bio should not be empty") : null;
    //find and update if can
    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        bio: { $exists: false },
      },
      {
        bio: bio,
      },
      {
        new: true, //
        select: "_id", //
      }
    );
    !page ? createError(404, "There is previous bio") : null;

    res.status(200).json({ message: "Bio has been added " });
  } catch (error) {
    next(error);
  }
};
export const updateBio = async (req, res, next) => {
  const pageId = req.body.pageId;
  const bio = req.body.bio;

  try {
    bio.length === 0 ? createError(422, "Bio should not be empty") : null;

    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        bio: { $exists: true },
      },
      {
        bio: bio,
      },
      {
        new: true, //
        select: "_id", //
      }
    );
    !page ? createError(404, "There is no  previous bio") : null;
    res.status(200).json({ message: "Bio was updated" });
  } catch (error) {
    next(error);
  }
};
export const updateCategories = async (req, res, next) => {
  const categories = req.body.categories;
  const pageId = req.body.pageId;
  const errors = validationResult(req);
  try {
    if (!errors.isEmpty()) {
      createError(422, "Validation failed", errors.array());
    }

    await Page.findOneAndUpdate(
      {
        _id: pageId,
      },
      {
        categories: categories,
      },
      {
        new: true, //
        select: "_id", //
      }
    );
    res.status(200).json({ message: "Categories was updated" });
  } catch (error) {
    next(error);
  }
};

export const addEducation_College = async (req, res, next) => {
  const errors = validationResult(req);
  const collegeName = req.body.collegeName;
  const graduated = req.body.graduated;
  const pageId = req.body.pageId;

  try {
    if (!errors.isEmpty()) {
      createError(422, "Validation failed", errors.array());
    }
    await Page.updateOne(
      {
        _id: pageId,
      },
      {
        $push: { "education.college": { name: collegeName, graduated } },
      },
      {
        new: true, //
        select: "_id", //
      }
    );

    res.status(201).json({ message: "College has been added" });
  } catch (error) {
    next(error);
  }
};
export const updateEducation_College = async (req, res, next) => {
  const errors = validationResult(req);
  const collegeName = req.body.collegeName;
  const graduated = req.body.graduated;
  const pageId = req.body.pageId;
  const _idCollege = req.body._idCollege;

  try {
    if (!errors.isEmpty()) {
      createError(422, "Validation failed", errors.array());
    }

    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        "education.college._id": _idCollege,
      },
      {
        $set: {
          "education.college.$.name": collegeName,
          "education.college.$.graduated": graduated,
        },
      },
      {
        new: true, //
        select: "_id", //
      }
    );

    !page ? createError(404, "No college with this ID") : null;

    res.status(200).json({ message: "College has been updated" });
  } catch (error) {
    next(error);
  }
};
export const deleteEducation_College = async (req, res, next) => {
  const pageId = req.body.pageId;
  const _idCollege = req.body._idCollege;

  try {
    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        "education.college._id": _idCollege,
      },
      {
        $pull: { "education.college": { _id: _idCollege } },
      },
      {
        new: true, //
        select: "_id", //
      }
    );

    !page ? createError(404, "No college with this ID") : null;

    res.status(200).json({ message: "College has been deleted" });
  } catch (error) {
    next(error);
  }
};
export const addEducation_HighSchool = async (req, res, next) => {
  const errors = validationResult(req);
  const highSchoolName = req.body.highSchoolName;
  const year = req.body.year;
  const pageId = req.body.pageId;

  try {
    if (!errors.isEmpty()) {
      createError(422, "Validation failed", errors.array());
    }

    await Page.updateOne(
      {
        _id: pageId,
      },
      {
        $push: { "education.highSchool": { name: highSchoolName, year: year } },
      },
      {
        new: true, //
        select: "_id", //
      }
    );
    res.status(201).json({ message: "High school has been added" });
  } catch (error) {
    next(error);
  }
};
export const updateEducation_HighSchool = async (req, res, next) => {
  const errors = validationResult(req);
  const highSchoolName = req.body.highSchoolName;
  const year = req.body.year;
  const pageId = req.body.pageId;
  const _idHighSchool = req.body._idHighSchool;

  try {
    if (!errors.isEmpty()) {
      createError(422, "Validation failed", errors.array());
    }
    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        "education.highSchool._id": _idHighSchool,
      },
      {
        $set: {
          "education.highSchool.$.name": highSchoolName,
          "education.highSchool.$.year": year,
        },
      },
      {
        new: true, //
        select: "_id", //
      }
    );

    !page ? createError(404, "No High school with this ID") : null;

    res.status(200).json({ message: "High school has been updated" });
  } catch (error) {
    next(error);
  }
};
export const deleteEducation_HighSchool = async (req, res, next) => {
  const pageId = req.body.pageId;
  const _idHighSchool = req.body._idHighSchool;

  try {
    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        "education.highSchool._id": _idHighSchool,
      },
      {
        $pull: { "education.highSchool": { _id: _idHighSchool } },
      },
      {
        new: true, //
        select: "_id", //
      }
    );

    !page ? createError(404, "No High school with this ID") : null;

    res.status(200).json({ message: "High school has been deleted" });
  } catch (error) {
    next(error);
  }
};

export const addCurrentCity = async (req, res, next) => {
  const errors = validationResult(req);

  const nameOfCity = req.body.name;
  const pageId = req.body.pageId;
  try {
    if (!errors.isEmpty()) {
      createError(422, "Validation failed", errors.array());
    }
    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        "placesLived.currentCity": { $exists: false },
      },
      {
        "placesLived.currentCity": nameOfCity,
      },
      {
        new: true, //
        select: "_id", //
      }
    );
    !page ? createError(404, "There is previous city ") : null;
    res.status(201).json({ message: "Your city was added" });
  } catch (error) {
    next(error);
  }
};
export const updateCurrentCity = async (req, res, next) => {
  const errors = validationResult(req);
  const pageId = req.body.pageId;
  const nameOfCity = req.body.name;

  try {
    if (!errors.isEmpty()) {
      createError(422, "Validation of city name failed", errors.array());
    }
    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        "placesLived.currentCity": { $exists: true },
      },
      {
        "placesLived.currentCity": nameOfCity,
      },
      {
        new: true, //
        select: "_id", //
      }
    );
    !page ? createError(404, "There is no  previous city") : null;

    res.status(200).json({ message: "Your city was updated" });
  } catch (error) {
    next(error);
  }
};
export const deleteCurrentCity = async (req, res, next) => {
  const pageId = req.body.pageId;

  try {
    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        "placesLived.currentCity": { $exists: true },
      },
      {
        $unset: { "placesLived.currentCity": 1 },
      },
      {
        new: true, //
        select: "_id", //
      }
    );
    !page ? createError(404, "There is no  previous city to delete it") : null;

    res.status(200).json({ message: "Your city was deleted" });
  } catch (error) {
    next(error);
  }
};
export const addHometown = async (req, res, next) => {
  const errors = validationResult(req);

  const hometownName = req.body.name;
  const pageId = req.body.pageId;
  try {
    if (!errors.isEmpty()) {
      createError(422, "Validation of hometwon name failed", errors.array());
    }
    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        "placesLived.homeTown": { $exists: false },
      },
      {
        "placesLived.homeTown": hometownName,
      },
      {
        new: true, //
        select: "_id", //
      }
    );
    !page ? createError(404, "There is hometown ") : null;
    res.status(201).json({ message: "Your hometown name has been added" });
  } catch (error) {
    next(error);
  }
};
export const updateHometown = async (req, res, next) => {
  const errors = validationResult(req);
  const pageId = req.body.pageId;
  const hometownName = req.body.name;

  try {
    if (!errors.isEmpty()) {
      createError(422, "Validation of hometown name failed", errors.array());
    }
    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        "placesLived.homeTown": { $exists: true },
      },
      {
        "placesLived.homeTown": hometownName,
      },
      {
        new: true, //
        select: "_id", //
      }
    );
    !page ? createError(404, "There is no  homeTown") : null;
    res.status(200).json({ message: "Your hometown was updated" });
  } catch (error) {
    next(error);
  }
};
export const deleteHometown = async (req, res, next) => {
  const pageId = req.body.pageId;

  try {
    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        "placesLived.homeTown": { $exists: true },
      },
      {
        $unset: { "placesLived.homeTown": 1 },
      },
      {
        new: true, //
        select: "_id", //
      }
    );
    !page
      ? createError(404, "There is no  previous homeTown to delete it")
      : null;
    res.status(200).json({ message: "Your hometown was deleted" });
  } catch (error) {
    next(error);
  }
};
export const addPhoneNumber = async (req, res, next) => {
  const errors = validationResult(req);

  const phoneNumber = req.body.phoneNumber;
  const pageId = req.body.pageId;
  try {
    if (!errors.isEmpty()) {
      createError(422, "Validation of phone number  failed", errors.array());
    }
    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        phoneNumber: { $exists: false },
      },
      {
        phoneNumber: phoneNumber,
      },
      {
        new: true, //
        select: "_id", //
      }
    );
    !page ? createError(400, "There is already phoneNumber ") : null;
    res.status(201).json({ message: "Your phone Number  has been added" });
  } catch (error) {
    next(error);
  }
};
export const updatePhoneNumber = async (req, res, next) => {
  const errors = validationResult(req);
  const pageId = req.body.pageId;
  const phoneNumber = req.body.phoneNumber;

  try {
    if (!errors.isEmpty()) {
      createError(422, "Validation of phone number failed", errors.array());
    }
    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        phoneNumber: { $exists: true },
      },
      {
        phoneNumber: phoneNumber,
      },
      {
        new: true, //
        select: "_id", //
      }
    );
    !page ? createError(404, "There is no  phone number") : null;
    res.status(200).json({ message: "Your phone number has been updated" });
  } catch (error) {
    next(error);
  }
};
export const deletePhoneNumber = async (req, res, next) => {
  const pageId = req.body.pageId;

  try {
    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        phoneNumber: { $exists: true },
      },
      {
        $unset: { phoneNumber: 1 },
      },
      {
        new: true, //
        select: "_id", //
      }
    );
    !page
      ? createError(404, "There is no  previous phone number to delete it")
      : null;
    res.status(200).json({ message: "Your phone number has been deleted" });
  } catch (error) {
    next(error);
  }
};
export const addEmail = async (req, res, next) => {
  const errors = validationResult(req);

  const email = req.body.email;
  const pageId = req.body.pageId;
  try {
    if (!errors.isEmpty()) {
      createError(422, "Validation of email  failed", errors.array());
    }
    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        email: { $exists: false },
      },
      {
        email: email,
      },
      {
        new: true, //
        select: "_id", //
      }
    );
    !page ? createError(400, "There is already email ") : null;
    res.status(201).json({ message: "Your email has been added" });
  } catch (error) {
    next(error);
  }
};
export const updateEmail = async (req, res, next) => {
  const errors = validationResult(req);
  const pageId = req.body.pageId;
  const email = req.body.email;

  try {
    if (!errors.isEmpty()) {
      createError(422, "Validation of email failed", errors.array());
    }
    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        email: { $exists: true },
      },
      {
        email: email,
      },
      {
        new: true, //
        select: "_id", //
      }
    );
    !page ? createError(404, "There is no email") : null;
    res.status(200).json({ message: "Your email has been updated" });
  } catch (error) {
    next(error);
  }
};
export const deleteEmail = async (req, res, next) => {
  const pageId = req.body.pageId;

  try {
    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        email: { $exists: true },
      },
      {
        $unset: { email: 1 },
      },
      {
        new: true, //
        select: "_id", //
      }
    );
    !page
      ? createError(404, "There is no  previous phone number to delete it")
      : null;
    res.status(200).json({ message: "Your email has been deleted" });
  } catch (error) {
    next(error);
  }
};
export const blockUser = async (req, res, next) => {
  const pageId = req.body.pageId;
  const userId = req.body.userId;
  const yourId = req.userId;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (yourId.toString() === userId) {
      createError(422, "Error with this ID;You block Your self");
    }

    //check if user found
    const user = await User.findById(userId, {
      _id: 1,
    });
    if (!user) {
      createError(404, "There are no user with this ID");
    }

    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        "usersBlocked.userId": { $nin: userId },
      },
      {
        $push: {
          usersBlocked: {
            userId: userId,
            date: new Date(),
          },
        },
        $pull: {
          usersLiked: userId,
        },
      },
      {
        new: true, // This option returns the updated document
        select: "_id",
        session,
      }
    );

    !page ? createError(400, "user Already blocked") : null;
    await User.updateOne(
      { _id: userId },
      {
        $push: { blockedPages: pageId },
        $pull: { likedPages: pageId },
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: `User has been blocked` });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
export const unblockUser = async (req, res, next) => {
  const pageId = req.body.pageId;
  const userId = req.body.userId;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        "usersBlocked.userId": { $in: userId },
      },
      {
        $pull: { usersBlocked: { userId: userId } },
      },
      {
        new: true,
        select: "_id",
        session,
      }
    );

    await User.updateOne(
      { _id: userId },
      {
        $pull: { blockedPages: pageId },
      },
      {
        session,
      }
    );
    !page ? createError(400, "user did not block") : null;

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: `User has been unblocked` });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
export const deletePage = async (req, res, next) => {
  const pageId = req.body.pageId;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    //1-extract ids of likers,usersblocked and id of owner +logo
    const page = await Page.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(pageId),
        },
      },
      {
        $project: {
          usersLiked: 1,
          usersBlocked: 1,
          owner: 1,
          logo: 1,
          cover: 1,
        },
      },
      { $unwind: { path: "$usersLiked", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$usersBlocked", preserveNullAndEmptyArrays: true } },

      {
        $project: {
          _id: 1,
          usersLiked: 1,
          usersBlocked: "$usersBlocked.userId",
          owner: 1,
          logo: 1,
          cover: 1,
        },
      },
      {
        $group: {
          _id: null,
          usersLiked: { $push: "$usersLiked" },
          usersBlocked: { $push: "$usersBlocked" },
          owner: { $addToSet: "$owner" },
          logo: { $addToSet: "$logo" },
          cover: { $addToSet: "$cover" },
        },
      },
      {
        $project: {
          _id: 0,
          allMembers: {
            $concatArrays: ["$usersLiked", "$usersBlocked", "$owner"],
          },
          coverAndLogo: { $concatArrays: ["$logo", "$cover"] },
        },
      },
    ]);

    //2-extract assets and ids of posts +assets of comments
    let assets = [];
    let ids = [];
    const posts = await Post.aggregate([
      {
        $match: {
          page: new mongoose.Types.ObjectId(pageId),
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
    if (page[0].coverAndLogo) {
      assets.push(...page[0].coverAndLogo);
    }

    let done = 0;
    // 3-update users collection : pull page for all users and for member is blocked also pull page
    let allMembers = page[0].allMembers;
    await User.updateMany(
      {
        _id: { $in: allMembers },
      },
      {
        $pull: {
          likedPages: pageId,
          blockedPages: pageId,
          ownedPage: pageId,
        },
      },
      {
        session,
      }
    );
    //4-delete all invite from this group
    await User.updateMany(
      {},
      { $pull: { sentInvitesFromPage: { pageId: pageId } } },
      {
        session,
      }
    );
    //5- delete posts
    await Post.deleteMany({ _id: { $in: ids } }, { session });
    //6-delete page
    await Page.deleteOne(
      { _id: new mongoose.Types.ObjectId(pageId) },
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
export const inviteFriendToLikeInPage = async (req, res, next) => {
  const errors = validationResult(req);
  const yourId = req.userId;
  const friendId = req.body.friendId;
  const pageId = req.body.pageId;

  try {
    !errors.isEmpty() ? createError(422, "Validation Failed") : null;

    const you = await User.findOne(
      {
        _id: yourId,
        friends: { $in: friendId },
        $or: [{ likedPages: { $in: pageId } }, { ownedPage: { $in: pageId } }],
      },
      { _id: 1 }
    );

    !you ? createError(403, "Forbidden") : null;
    //get page with condition
    const page = await Page.findOne({
      _id: pageId,
      usersLiked: { $nin: friendId },
      owner: { $ne: friendId },
      "usersBlocked.userId": { $ne: friendId },
    });

    !page ? createError(403, "Forbidden") : null;

    // init invite
    const invite = {
      _id: new mongoose.Types.ObjectId(),
      senderId: yourId,
      pageId: new mongoose.Types.ObjectId(pageId),
      inviteDate: new Date(),
    };
    console.log(invite);
    //remove old invite from you and add new one
    await User.updateOne({ _id: friendId }, [
      {
        $set: {
          sentInvitesFromPage: {
            $cond: {
              if: { $eq: [{ $ifNull: ["$sentInvitesFromPage", []] }, []] }, // Check if array is empty

              then: [invite], // If empty, add immediate invite
              else: {
                $concatArrays: [
                  {
                    $filter: {
                      input: "$sentInvitesFromPage",
                      cond: {
                        $not: {
                          $and: [
                            { $eq: ["$$this.senderId", yourId] },
                            {
                              $eq: [
                                "$$this.pageId",
                                new mongoose.Types.ObjectId(pageId),
                              ],
                            },
                          ],
                        },
                      },
                    },
                  },
                  [invite],
                ],
              },
            },
          },
        },
      },
    ]);
    res.status(200).json({ message: "Your Invite has been sent" });
  } catch (error) {
    next(error);
  }
};

export const acceptingInvitationToPage = async (req, res, next) => {
  const errors = validationResult(req);
  const _id = req.body._InvitationId;
  const yourId = req.userId;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    !errors.isEmpty() ? createError(422, "Invalid ID") : null;

    const invitation = await User.findOne(
      {
        _id: yourId,
        "sentInvitesFromPage._id": { $eq: new mongoose.Types.ObjectId(_id) },
      },
      {
        "sentInvitesFromPage.$": 1,
      }
    );

    !invitation
      ? createError(404, "There are no invitation with this ID ")
      : null;

    const pageId = invitation.sentInvitesFromPage[0].pageId;

    //Here you can accept invitation
    //1-For User

    await User.updateOne(
      { _id: yourId },
      {
        $push: { likedPages: pageId },
        $pull: { sentInvitesFromPage: { pageId: pageId } },
      },
      { session }
    );
    //2-For Page
    await Page.updateOne(
      { _id: pageId },
      {
        $push: { usersLiked: yourId },
      },
      { session }
    );
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Invitation has been accepted" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
//not yet
export const cancelingInvitationToPage = async (req, res, next) => {
  const errors = validationResult(req);
  const _id = req.body._InvitationId;
  const yourId = req.userId;

  try {
    !errors.isEmpty() ? createError(422, "Validation Failed") : null;

    const invitation = await User.findOne(
      {
        _id: yourId,
        "sentInvitesFromPage._id": { $eq: new mongoose.Types.ObjectId(_id) },
      },
      { _id: 1 }
    );
    !invitation
      ? createError(404, "There are no invitation with this ID ")
      : null;

    await User.updateOne(
      { _id: yourId },
      {
        $pull: { sentInvitesFromPage: { _id: _id } },
      }
    );

    res.status(200).json({ message: "Invitation has been canceled" });
  } catch (error) {
    next(error);
  }
};

export const likeInPage = async (req, res, next) => {
  const pageId = req.body.pageId;
  const yourId = req.userId;
  const errors = validationResult(req);
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    !errors.isEmpty() ? createError(422, "Validaiton Failed") : null;

    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        usersLiked: { $nin: yourId },
        "usersBlocked.userId": { $nin: yourId },
      },
      {
        $push: { usersLiked: yourId },
      },
      { new: true, select: "_id", session }
    );

    !page ? createError(403, "Forbidden") : null;

    await User.updateOne(
      { _id: yourId },
      {
        $push: { likedPages: pageId },
      },
      { session }
    );
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "You liked In this page" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
export const unlikeInPage = async (req, res, next) => {
  const pageId = req.body.pageId;
  const yourId = req.userId;
  const errors = validationResult(req);
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    !errors.isEmpty() ? createError(422, "Invalid page ID") : null;
    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        usersLiked: { $in: yourId },
      },
      {
        $pull: { usersLiked: you._id },
      },
      { new: true, select: "_id", session }
    );

    !page ? createError(403, "Forbidden") : null;

    await User.updateOne(
      { _id: yourId },
      {
        $pull: { likedPages: pageId },
      },
      { session }
    );
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "You unliked In this page" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
export const ratePage = async (req, res, next) => {
  const errors = validationResult(req);
  const pageId = req.body.pageId;
  const yourId = req.userId;
  const comment = req.body.comment;
  const value = +req.body.value;

  try {
    !errors.isEmpty()
      ? createError(422, "Validation failed", errors.array())
      : null;

    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        usersLiked: { $in: yourId },
        "ratings.by": { $nin: yourId },
      },
      {
        $push: {
          ratings: { by: yourId, value, comment, ratingDate: new Date() },
        },
      },
      {
        new: true,
        select: "_id",
      }
    );
    !page ? createError(403, "Forbidden") : null;
    res.status(200).json({ message: "you has been rating successfully" });
  } catch (error) {
    next(error);
  }
};
export const updateRate = async (req, res, next) => {
  const errors = validationResult(req);
  const pageId = req.body.pageId;
  const yourId = req.userId;
  const comment = req.body.comment;
  const value = +req.body.value;
  const _id = req.body._rateId;

  try {
    !errors.isEmpty()
      ? createError(422, "Validation failed", errors.array())
      : null;

    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        ratings: { $elemMatch: { by: yourId, _id: _id } },
      },
      {
        $set: {
          "ratings.$.comment": comment,
          "ratings.$.value": value,
        },
      },
      {
        new: true,
        select: "_id",
      }
    );

    !page ? createError(403, "Forbidden") : null;

    res.status(200).json({ message: "you has been editing rate successfully" });
  } catch (error) {
    next(error);
  }
};
export const deleteRate = async (req, res, next) => {
  const errors = validationResult(req);
  const pageId = req.body.pageId;
  const yourId = req.userId;
  const _id = req.body._rateId;

  try {
    !errors.isEmpty()
      ? createError(422, "Validation failed", errors.array())
      : null;

    const page = await Page.findOneAndUpdate(
      {
        _id: pageId,
        ratings: { $elemMatch: { by: yourId, _id: _id } },
      },
      {
        $pull: { ratings: { by: yourId, _id: _id } },
      },
      {
        new: true,
        select: "_id",
      }
    );

    !page ? createError(403, "Forbidden") : null;
    res
      .status(200)
      .json({ message: "you has been deleting rate successfully" });
  } catch (error) {
    next(error);
  }
};

export const getMainInformations = async (req, res, next) => {
  const pageId = req.params.pageId;
  const role = req.role;

  try {
    const page = await Page.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(pageId) },
      },
      {
        $addFields: {
          role: role,
          isHeFollowers: role === pageRoles.FOLLOWERS ? true : false,
          isHeOwner: role === pageRoles.MODERATOR ? true : false,
        },
      },
      {
        $project: {
          name: 1,
          categories: 1,
          cover: 1,
          logo: 1,
          bio: 1,
          role: 1,
          isHeFollowers: 1,
          isHeOwner: 1,
          education: 1,
          phoneNumber: 1,
          placesLived: 1,
          email: 1,
        },
      },
    ]);

    res.status(200).json({ mainInfo: page });
  } catch (error) {
    next(error);
  }
};
export const getFollowers = async (req, res, next) => {
  const pageId = req.params.pageId;

  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;

  try {
    const aggregationResult = await Page.aggregate(
      followers(pageId, page, ITEMS_PER_PAGE)
    );

    const totalMembers = aggregationResult[0].totalCount;

    res.status(200).json({
      followers: aggregationResult[0].allMembers,
      extraInfo: information(totalMembers, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};
export const getModerator = async (req, res, next) => {
  const pageId = req.params.pageId;

  try {
    const page = await Page.findById(pageId, {
      owner: 1,
      _id: 0,
    }).populate({
      path: "owner",
      select: {
        firstName: 1,
        lastName: 1,
        logo: { $arrayElemAt: ["$profilePhotos", -1] },
      },
    });
    res.status(200).json({ moderator: page.owner });
  } catch (error) {
    next(error);
  }
};
export const getUsersBlocked = async (req, res, next) => {
  const pageId = req.params.pageId;
  const role = req.role;

  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;

  try {
    role !== pageRoles.MODERATOR ? createError(403, "Forbidden") : null;

    const aggregationResult = await Page.aggregate(
      usersBlocked(pageId, page, ITEMS_PER_PAGE)
    );

    const totalMembers = aggregationResult[0].totalCount;

    res.status(200).json({
      followers: aggregationResult[0].allMembers,
      extraInfo: information(totalMembers, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};

export const getPosts = async (req, res, next) => {
  
  const pageId = req.params.pageId;
  const role = req.role;
  const ITEMS_PER_PAGE = 20;
  const yourId = req.userId;

  const page = +req.query.page || 1;

  try {
    const aggregationResult = await Post.aggregate(
      posts(pageId, yourId, role, page, ITEMS_PER_PAGE)
    );

    const totalPosts = aggregationResult[0].totalCount;

    res.status(200).json({
      role: role,
      posts: aggregationResult[0].posts,
      extraInfo: information(totalPosts, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};

export const getRates = async (req, res, next) => {
  const pageId = req.params.pageId;
  const yourId = req.userId;
  const ITEMS_PER_PAGE = 2;
  const page = +req.query.page || 1;

  try {
    const aggregationResult = await Page.aggregate(
      rates(pageId, yourId, page, ITEMS_PER_PAGE)
    );
    const totalRate = aggregationResult[0].totalCount;

    res.status(200).json({
      avgRate: aggregationResult[0].avgRate[0].total,
      rates: aggregationResult[0].ratings,
      extraInfo: information(totalRate, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};

export const getYourFriendsWhoDidNotLike = async (req, res, next) => {
  const pageId = req.params.pageId;
  const role = req.role;
  const yourId = req.userId;
  const ITEMS_PER_PAGE = 1;
  const page = +req.query.page || 1;

  try {
    role === pageRoles.NOT_FOLLOWERS ? createError(403, "Forbidden") : null;

    const result = await User.find(
      {
        friends: { $in: yourId },
        likedPages: { $nin: pageId },
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

import mongoose from "mongoose";
import { validationResult } from "express-validator";

import User from "../models/user.js";
import Post from "../models/post.js";
import Group from "../models/group.js";
import Page from "../models/page.js";
import {
  FilterPhotoTypeAndSize,
  deleteAssets,
  fileFilterPhotosAndVideos,
  uploadAssets,
} from "../util/file.js";
import { createError } from "../util/helpers.js";
import {
  GroupsJoined,
  friends,
  friendsRequestSentByMe,
  friendsRequestSentToMe,
  groups,
  invitationsSentToMeFromGroups,
  invitationsSentToMeFromPages,
  pages,
  pagesIOwned,
  pagesLiked,
  pepole,
  postFromAll,
  posts,
} from "../util/queries/profile.js";
import { information } from "../util/queries/pagination.js";
import { groupRoles, profileRoles } from "../util/roles.js";
import { privacy, visibility } from "../util/configGroup.js";

export const addProfilePhotoAndSet = async (req, res, next) => {
  const photo = req.files;
  const yourId = req.userId;

  try {
    if (photo.length > 1 || photo.length === 0) {
      createError(422, "Please upload one photo please");
    }

    //here you can upload photo to cloudinary and update database

    FilterPhotoTypeAndSize(photo);
    var linkAndTypeForPhoto = undefined;
    linkAndTypeForPhoto = await uploadAssets(
      photo,
      `profile/${yourId}/ProfilePhotos`
    );
    var done = 0;
    const user = await User.findOneAndUpdate(
      { _id: yourId, profilePhotos: { $not: { $size: 10 } } },
      {
        $push: {
          profilePhotos: { asset: linkAndTypeForPhoto[0], date: new Date() },
        },
      },
      {
        new: true,
        select: "_id",
      }
    );

    !user ? createError(403, "10 photo Allow") : null;
    done = 1;
    res.status(201).json({
      message: "Profile photo has been added",
      photo: linkAndTypeForPhoto[0],
    });
  } catch (error) {
    if (linkAndTypeForPhoto && done === 0) {
      deleteAssets(linkAndTypeForPhoto);
    }
    next(error);
  }
};

export const setPreviousPhotoAsCurrentProfilePhoto = async (req, res, next) => {
  const yourId = req.userId;
  const publicID = req.body.publicID;

  try {
    const user = await User.findOne(
      {
        _id: yourId,
        "profilePhotos.asset.public_id": publicID,
      },
      {
        "profilePhotos.$": 1,
      }
    );

    !user ? createError(404, "There are no photo with this ID") : null;

    const photo = user.profilePhotos[0];

    await User.updateOne({ _id: yourId }, [
      {
        $set: {
          profilePhotos: {
            $concatArrays: [
              {
                $filter: {
                  input: "$profilePhotos",
                  cond: {
                    $not: {
                      $and: [
                        { $eq: ["$$this.asset", photo.asset] },
                        { $eq: ["$$this.date", photo.date] },
                      ],
                    },
                  },
                },
              },
              [{ asset: photo.asset, date: new Date() }],
            ],
          },
        },
      },
    ]);

    res.status(200).json({ message: "The photo has been set" });
  } catch (error) {
    next(error);
  }
};

export const deleteCurrentProfilePhotoOrPreviousPhoto = async (
  req,
  res,
  next
) => {
  const publicId = req.body.publicId;
  const yourId = req.userId;

  try {
    const user = await User.findOne(
      {
        _id: yourId,
        "profilePhotos.asset.public_id": publicId,
      },
      { profilePhotos: 1 }
    );

    !user ? createError(404, "There are no photo with This ID") : null;
    //get photo you want delete
    const photo = user.profilePhotos.find(
      (obj) => obj.asset.public_id === publicId
    );

    //is photo you want delete is current photo
    const isCurrent =
      user.profilePhotos[user.profilePhotos.length - 1].asset.public_id ===
      photo.asset.public_id
        ? true
        : false;

    //is your array of photos is one
    const isLengthOfArrayOne = user.profilePhotos.length === 1 ? true : false;

    let oldPhotoBeforeTheCurrent = {};
    let done = 0;
    if (!isLengthOfArrayOne && isCurrent) {
      oldPhotoBeforeTheCurrent =
        user.profilePhotos[user.profilePhotos.length - 2];

      await User.updateOne(
        {
          _id: yourId,
        },
        [
          {
            $set: {
              profilePhotos: {
                $concatArrays: [
                  {
                    $filter: {
                      input: "$profilePhotos",
                      cond: {
                        $and: [
                          {
                            $not: {
                              $and: [
                                { $eq: ["$$this.asset", photo.asset] },
                                { $eq: ["$$this.date", photo.date] },
                              ],
                            },
                          },
                          {
                            $not: {
                              $and: [
                                {
                                  $eq: [
                                    "$$this.asset",
                                    oldPhotoBeforeTheCurrent.asset,
                                  ],
                                },
                                {
                                  $eq: [
                                    "$$this.date",
                                    oldPhotoBeforeTheCurrent.date,
                                  ],
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  },
                  [{ asset: oldPhotoBeforeTheCurrent.asset, date: new Date() }],
                ],
              },
            },
          },
        ]
      );
    } else {
      await User.updateOne(
        {
          _id: yourId,
        },
        {
          $pull: { profilePhotos: photo },
        }
      );
    }

    done = 1;

    res.status(200).json({
      message: `Deleted successfuly  ${
        isLengthOfArrayOne
          ? " and now there are no photo"
          : isCurrent
          ? " and the new photo become (in result)"
          : ""
      }`,
      result: oldPhotoBeforeTheCurrent,
    });
    done ? await deleteAssets([photo.asset]) : null;
  } catch (error) {
    next(error);
  }
};

//update or add
export const updateProfileBio = async (req, res, next) => {
  const yourId = req.userId;
  const bio = req.body.bio;
  try {
    if (!bio) {
      createError(422, "Bio is empty");
    }

    await User.updateOne(
      { _id: yourId },
      {
        bio: bio,
      }
    );
    res.status(201).json({ message: "Bio was updated", bio });
  } catch (error) {
    next(error);
  }
};

export const updateProfileBackgroundPhoto = async (req, res, next) => {
  const newPhoto = req.files;
  const yourId = req.userId;

  console.log(req);
  try {
    if (!newPhoto || newPhoto.length > 1) {
      const error = new Error("Please upload one backgroundPhoto please ");
      error.statusCode = 422;
      throw error;
    }

    //here you can upload photo to cloudinary and update database

    fileFilterPhotosAndVideos(newPhoto);
    const linkAndTypeForPhoto = await uploadAssets(
      newPhoto,
      1,
      `profile/${yourId}/BackgroundPhoto`
    );

    const user = await User.findOne({ _id: yourId }, { backgroundPhotos: 1 });
    const oldPhoto = user.backgroundPhotos;
    console.log(oldPhoto);
    await User.updateOne(
      { _id: yourId },
      {
        backgroundPhotos: linkAndTypeForPhoto[0],
      }
    );

    res.status(200).json({
      message: "Succss",
      link: linkAndTypeForPhoto[0],
    });

    if (oldPhoto) {
      await deleteAssets([oldPhoto]);
    }
  } catch (error) {
    next(error);
  }
};

export const updateProfileBirthday = async (req, res, next) => {
  const errors = validationResult(req);
  const yourId = req.userId;
  const birthday = req.body.birthday;
  try {
    if (!errors.isEmpty()) {
      createError(422, "Validation of birthday failed", errors.array());
    }
    console.log(birthday);
    const a = await User.updateOne(
      { _id: new mongoose.Types.ObjectId(yourId) },
      {
        birthDay: birthday,
      }
    );
    console.log(a);
    res.status(201).json({ message: "Birthday was updated" });
  } catch (error) {
    next(error);
  }
};
export const updateProfileGender = async (req, res, next) => {
  const errors = validationResult(req);
  const yourId = req.userId;
  const gender = req.body.gender;

  try {
    if (!errors.isEmpty()) {
      createError(422, "Validation of gender failed", errors.array());
    }

    await User.updateOne(
      { _id: yourId },
      {
        gender: gender,
      }
    );

    res.status(201).json({ message: "gender was updated" });
  } catch (error) {
    next(error);
  }
};

export const updateFirstAndLastName = async (req, res, next) => {
  const errors = validationResult(req);
  const yourId = req.userId;
  const newfirstName = req.body.newFirstName;
  const newlastName = req.body.newLastName;

  try {
    if (!errors.isEmpty()) {
      createError(422, "Validation  name  failed");
    }

    const user = await User.findById(yourId, {
      canChangeName: 1,
      firstName: 1,
      lastName: 1,
    });
    const lastChangeDate = user.canChangeName;

    if (lastChangeDate) {
      const currentDate = new Date();

      // Calculate age
      const days = Math.floor(
        (currentDate - lastChangeDate) / (365.25 * 24 * 60 * 60 * 1000)
      );

      if (days < 60) {
        createError(
          403,
          `You can not change your name before 60 days you need wait ${
            60 - days
          } days`
        );
      }
    }
    user.firstName = newfirstName;
    user.lastName = newlastName;
    user.canChangeName = new Date();
    await user.save();
    res.status(201).json({ message: "Your name was updated" });
  } catch (error) {
    next(error);
  }
};

export const deleteProfileBackgroundPhoto = async (req, res, next) => {
  const yourId = req.userId;
  const publicId = req.body.publicId;

  try {
    if (!publicId) {
      const error = new Error("Please  send the public id");
      error.statusCode = 404;
      throw error;
    }

    const user = await User.findOneAndUpdate(
      {
        _id: yourId,
        "backgroundPhotos.public_id": publicId,
      },
      {
        $unset: { backgroundPhotos: 1 },
      },
      { new: true, select: "_id" }
    );

    !user ? createError(404, "There are no photo with this ID") : null;

    res.status(200).json({ message: "Photo was deleted" });

    await deleteAssets([{ resource_type: "image", public_id: publicId }]);
  } catch (error) {
    next(error);
  }
};

export const addEducationCollege = async (req, res, next) => {
  const errors = validationResult(req);
  const collegeName = req.body.nameofCollege;
  const graduated = req.body.graduated;
  const yourId = req.userId;

  try {
    !errors.isEmpty()
      ? createError(422, "Validation failed", errors.array())
      : null;
    const user = await User.findOneAndUpdate(
      {
        _id: yourId,
        "education.college": { $size: 0 },
      },
      {
        $push: { "education.college": { name: collegeName, graduated } },
      },
      {
        new: true, //
        select: "_id education.college", //
      }
    );
    console.log(user);
    !user ? createError(400, "There is a previous college") : null;
    res.status(201).json({
      message: "College has been added",
      college: user.education.college[0],
    });
  } catch (error) {
    next(error);
  }
};
export const updateEducationCollege = async (req, res, next) => {
  const errors = validationResult(req);
  const _idCollege = req.body.id;
  const collegeName = req.body.nameofCollege;
  const graduated = req.body.graduated;
  const yourId = req.userId;

  try {
    !errors.isEmpty()
      ? createError(422, "Validation failed", errors.array())
      : null;

    const user = await User.findOneAndUpdate(
      {
        _id: yourId,
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

    !user ? createError(404, "No college with this ID") : null;

    res.status(200).json({ message: "College has been updated" });
  } catch (error) {
    next(error);
  }
};

export const addEducationHighSchool = async (req, res, next) => {
  const errors = validationResult(req);
  const yourId = req.userId;
  const highSchoolName = req.body.nameofHighSchool;
  const year = req.body.year;

  try {
    !errors.isEmpty()
      ? createError(422, "Validation failed", errors.array())
      : null;

    const user = await User.findOneAndUpdate(
      {
        _id: yourId,
        "education.highSchool": { $size: 0 },
      },
      {
        $push: { "education.highSchool": { name: highSchoolName, year: year } },
      },
      {
        new: true, //
        select: "_id education.highSchool", //
      }
    );
    !user ? createError(400, "There is a previous high school") : null;

    res.status(201).json({
      message: "High school was added",
      highSchool: user.education.highSchool[0],
    });
  } catch (error) {
    next(error);
  }
};
export const updateEducationHighSchool = async (req, res, next) => {
  const errors = validationResult(req);
  const yourId = req.userId;
  const _idHighSchool = req.body.id;
  const highSchoolName = req.body.nameofHighSchool;
  const year = req.body.year;

  try {
    !errors.isEmpty()
      ? createError(422, "Validation failed", errors.array())
      : null;
    const user = await User.findOneAndUpdate(
      {
        _id: yourId,
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

    !user ? createError(404, "No High school with this ID") : null;

    res.status(200).json({ message: "High School has been updated" });
  } catch (error) {
    next(error);
  }
};

export const deleteEducationCollege = async (req, res, next) => {
  const _idCollege = req.body.idCollege;
  const yourId = req.userId;
  try {
    const user = await User.findOneAndUpdate(
      {
        _id: yourId,
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

    !user ? createError(404, "No college with this ID") : null;

    res.status(200).json({ message: "College was deleted" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
export const deleteEducationHighSchool = async (req, res, next) => {
  const yourId = req.userId;
  const _idHighSchool = req.body.idHighSchool;

  try {
    const user = await User.findOneAndUpdate(
      {
        _id: yourId,
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

    !user ? createError(404, "No High school with this ID") : null;

    res.status(200).json({ message: "High School was deleted" });
  } catch (error) {
    next(error);
  }
};

export const addCurrentCity = async (req, res, next) => {
  const errors = validationResult(req);
  const yourId = req.userId;
  const nameOfCity = req.body.name;
  try {
    !errors.isEmpty()
      ? createError(422, "Validation of city name failed", errors.array())
      : null;

    const user = await User.findOneAndUpdate(
      {
        _id: yourId,
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
    !user ? createError(400, "There is city ") : null;

    res.status(201).json({ message: "Your city has been added" });
  } catch (error) {
    next(error);
  }
};
export const updateCurrentCity = async (req, res, next) => {
  const errors = validationResult(req);
  const yourId = req.userId;
  const nameOfCity = req.body.name;

  try {
    !errors.isEmpty()
      ? createError(422, "Validation Failed", errors.array())
      : null;

    const user = await User.findOneAndUpdate(
      {
        _id: yourId,
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
    !user ? createError(404, "There is no  current city") : null;
    res.status(200).json({ message: "Your city was updated" });
  } catch (error) {
    next(error);
  }
};
export const deleteCurrentCity = async (req, res, next) => {
  const yourId = req.userId;

  try {
    const user = await User.findOneAndUpdate(
      {
        _id: yourId,
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
    !user
      ? createError(404, "There is no  previous current city to delete it")
      : null;
    res.status(200).json({ message: "Your city was deleted" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
export const addHometown = async (req, res, next) => {
  const errors = validationResult(req);
  const yourId = req.userId;
  const hometownName = req.body.name;
  try {
    !errors.isEmpty()
      ? createError(422, "Validation failed", errors.array())
      : null;

    const user = await User.findOneAndUpdate(
      {
        _id: yourId,
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
    !user ? createError(400, "There is hometown ") : null;

    res.status(201).json({ message: "Your homwtown name has been added" });
  } catch (error) {
    next(error);
  }
};
export const updateHometown = async (req, res, next) => {
  const errors = validationResult(req);
  const yourId = req.userId;
  const hometownName = req.body.name;

  try {
    !errors.isEmpty()
      ? createError(422, "Validation of hometown name failed", errors.array())
      : null;

    const user = await User.findOneAndUpdate(
      {
        _id: yourId,
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
    !user ? createError(404, "There is no  homeTown") : null;

    res.status(200).json({ message: "Your hometown name was updated" });
  } catch (error) {
    next(error);
  }
};
export const deleteHometown = async (req, res, next) => {
  const yourId = req.userId;
  try {
    const user = await User.findOneAndUpdate(
      {
        _id: yourId,
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
    !user
      ? createError(404, "There is no  previous homeTown to delete it")
      : null;
    res.status(200).json({ message: "Your hometown was deleted" });
  } catch (error) {
    next(error);
  }
};

export const addPhoneNumber = async (req, res, next) => {
  const errors = validationResult(req);
  const yourId = req.userId;
  const phoneNumber = req.body.phoneNumber;

  try {
    !errors.isEmpty()
      ? createError(422, "Validation Failed", errors.array())
      : null;
    const user = await User.findOneAndUpdate(
      {
        _id: yourId,
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
    !user ? createError(404, "There is previous phoneNumber") : null;

    res.status(201).json({ message: "Your phone number has been added" });
  } catch (error) {
    next(error);
  }
};
export const updatePhoneNumber = async (req, res, next) => {
  const errors = validationResult(req);
  const yourId = req.userId;
  const phoneNumber = req.body.phoneNumber;
  console.log(yourId);
  try {
    !errors.isEmpty()
      ? createError(422, "Validation failed", errors.array())
      : null;

    const user = await User.findOneAndUpdate(
      {
        _id: yourId,
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

    !user ? createError(404, "There is no  previous phoneNumber") : null;

    res.status(200).json({ message: "Your phone number has been updated" });
  } catch (error) {
    next(error);
  }
};
export const deletePhoneNumber = async (req, res, next) => {
  const yourId = req.userId;

  try {
    const user = await User.findOneAndUpdate(
      {
        _id: yourId,
      },
      {
        $unset: { phoneNumber: 1 },
      },
      {
        new: true, //
        select: "_id", //
      }
    );

    !user ? createError(400, "There are no phone number to delete") : null;

    res.status(200).json({ message: "Your phone number has been  deleted" });
  } catch (error) {
    next(error);
  }
};

export const sendFriendRequest = async (req, res, next) => {
  const yourId = req.userId; //sender
  const reciverId = req.body.reciverId;
  const session = await mongoose.startSession();
  session.startTransaction();

  yourId === reciverId ? createError(403, "Forbidden") : null;

  try {
    const reciver = await User.findOneAndUpdate(
      {
        _id: reciverId,
        "friendsRequestRecieve.from": { $ne: yourId },
        "friendsRequestSend.to": { $ne: yourId },
        friends: { $nin: yourId },
        profilesYouBlocked: { $nin: yourId },
      },
      {
        $push: {
          friendsRequestRecieve: {
            from: yourId,
            dateSending: new Date(),
          },
        },
      },
      {
        new: true,
        select: "_id",
        session,
      }
    );

    !reciver ? createError(403, "Forbidden") : null;

    const you = await User.findOneAndUpdate(
      { _id: yourId, profilesYouBlocked: { $nin: reciverId } },
      {
        $push: {
          friendsRequestSend: { to: reciverId, dateSending: new Date() },
        },
      },
      {
        new: true,
        select: "_id",
        session,
      }
    );
    !you ? createError(403, "Forbidden") : null;
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Your Request has been sent" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
export const acceptFriendRequest = async (req, res, next) => {
  const senderId = req.body.senderId; //sender
  const yourId = req.userId;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const sender = await User.findOneAndUpdate(
      {
        _id: senderId,
        "friendsRequestSend.to": { $in: yourId },
      },
      {
        $pull: { friendsRequestSend: { to: yourId } },
        $push: { friends: yourId },
      },
      {
        new: true,
        select: "_id",
        session,
      }
    );
    !sender ? createError(403, "Forbidden") : null;

    await User.updateOne(
      { _id: yourId },
      {
        $pull: { friendsRequestRecieve: { from: senderId } },
        $push: { friends: senderId },
      },
      {
        session,
      }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: `accepted`,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const cancelFriendRequestSentToMe = async (req, res, next) => {
  const senderId = req.body.senderId; //sender
  const yourId = req.userId;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const sender = await User.findOneAndUpdate(
      {
        _id: senderId,
        "friendsRequestSend.to": { $in: yourId },
      },
      {
        $pull: { friendsRequestSend: { to: yourId } },
      },
      {
        new: true,
        select: "_id",
        session,
      }
    );
    !sender ? createError(403, "Forbidden") : null;

    await User.updateOne(
      { _id: yourId },
      { $pull: { friendsRequestRecieve: { from: senderId } } },
      {
        session,
      }
    );

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({
      message: `Request friend was canceled`,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
export const cancelFriendRequestSentByMe = async (req, res, next) => {
  const reciverId = req.body.reciverId;
  const yourId = req.userId;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const reciver = await User.findOneAndUpdate(
      {
        _id: reciverId,
        "friendsRequestRecieve.from": { $in: yourId },
      },
      {
        $pull: { friendsRequestRecieve: { from: yourId } },
      },
      {
        new: true,
        select: "_id",
        session,
      }
    );
    !reciver ? createError(403, "Forbidden") : null;

    await User.updateOne(
      { _id: yourId },
      { $pull: { friendsRequestSend: { to: reciverId } } },
      {
        session,
      }
    );

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({
      message: `Request friend was canceled`,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const unfriend = async (req, res, next) => {
  const idFriend = req.body.idFriend;
  const yourId = req.userId;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const friend = await User.findOneAndUpdate(
      {
        _id: idFriend,
        friends: { $in: yourId },
      },
      {
        $pull: { friends: yourId },
      },
      {
        new: true,
        select: "_id",
        session,
      }
    );

    !friend ? createError(403, "Forbidden") : null;

    await User.updateOne(
      { _id: yourId },
      {
        $pull: { friends: idFriend },
      },
      {
        session,
      }
    );

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: `done` });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    next(error);
  }
};

export const sendRequestJoin = async (req, res, next) => {
  const groupId = req.body.groupId;
  const yourId = req.userId;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    //دعوة بشكل عام مابهم عضو او ادمن
    const yourInvites = await User.findById(yourId, {
      sentInvitesFromGroups: {
        $filter: {
          input: "$sentInvitesFromGroups",
          as: "invite",
          cond: {
            $eq: ["$$invite.groupId", new mongoose.Types.ObjectId(groupId)],
          },
        },
      },
    });

    const group = await Group.findOne(
      {
        _id: groupId,
        membersBlocked: { $nin: yourId },
        "members.userId": { $ne: yourId },
        "admins.userId": { $ne: yourId },
        moderator: { $ne: yourId },
        "joiningRequests.userId": { $ne: yourId },
        visibility:
          yourInvites.sentInvitesFromGroups.length === 0
            ? { $ne: visibility.HIDDEN }
            : { $in: [visibility.HIDDEN, visibility.VISIBLE] },
      },
      { _id: 1, visibility: 1, privacy: 1 }
    );

    !group ? createError(403, "Forbidden") : null;

    //extract invites which are from admin or moderator
    const InvitesFromAdminOrModerator = yourInvites.sentInvitesFromGroups.find(
      (invite) =>
        invite.groupId.toString() === groupId &&
        (invite.senderRole === groupRoles.ADMIN ||
          invite.senderRole === groupRoles.MODERATOR)
    );

    //extract invites which are from admin or moderator
    const InvitesFromMembers = yourInvites.sentInvitesFromGroups.find(
      (invite) =>
        invite.groupId.toString() === groupId &&
        invite.senderRole === groupRoles.MEMBER
    );

    // انضمام مباشر
    //remove invites
    let immediateJoining = false;
    if (
      (group.visibility === visibility.VISIBLE &&
        group.privacy === privacy.PRIVATE &&
        InvitesFromAdminOrModerator) ||
      (group.visibility === visibility.VISIBLE &&
        group.privacy === privacy.PUBLIC) ||
      (group.visibility == visibility.HIDDEN && InvitesFromAdminOrModerator)
    ) {
      immediateJoining = true;
      await Group.updateOne(
        { _id: groupId },
        {
          $push: {
            members: {
              userId: yourId,
              joiningDate: new Date(),
            },
          },
        },
        { session }
      );
      //remove invites  and you will not get any invites from this group  beacuse you are in
      await User.updateOne(
        { _id: yourId },
        {
          $push: { groups: groupId },
          $pull: { sentInvitesFromGroups: { groupId: groupId } },
        },
        { session }
      );
    }

    // طلب ارسل
    //  i will remove invites --> will remove and can recivie invites while he not join or blocked
    if (
      (group.visibility === visibility.VISIBLE &&
        group.privacy === privacy.PRIVATE &&
        !InvitesFromAdminOrModerator) ||
      (group.visibility == visibility.HIDDEN && InvitesFromMembers)
    ) {
      await Group.updateOne(
        { _id: groupId },
        {
          $push: {
            joiningRequests: {
              userId: yourId,
              requestDate: new Date(),
            },
          },
        },
        { session }
      );
      //remove invites  and you will get any invites from this group  because still you did not join
      await User.updateOne(
        { _id: yourId },
        {
          $pull: { sentInvitesFromGroups: { groupId: groupId } },
        },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.json({
      message: `${
        immediateJoining ? "You joined the group" : "Request has been sent"
      }`,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

export const cancelRequestJoin = async (req, res, next) => {
  const groupId = req.body.groupId;
  const yourId = req.userId;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const group = await Group.findOneAndUpdate(
      {
        _id: groupId,
        "joiningRequests.userId": { $eq: you._id },
      },
      {
        $pull: {
          joiningRequests: {
            userId: you._id,
          },
        },
      },
      {
        new: true,
        select: "_id",
        session,
      }
    );

    !group ? createError(404, "did not find the request") : null;

    await User.updateOne(
      { _id: yourId },
      {
        $pull: { sentInvitesFromGroups: { groupId: groupId } },
      },
      {
        session,
      }
    );

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Joining request has been Canceled  " });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
// accept invite in front end is: go to group
export const cancelInvite = async (req, res, next) => {
  const _id = req.body._id; //id الدعوة  // every doc contain _id ,senderId,...
  const yourId = req.userId;
  try {
    const invite = await User.findOneAndUpdate(
      {
        _id: yourId,
        "sentInvitesFromGroups._id": { $eq: _id },
      },
      {
        $pull: { sentInvitesFromGroups: { _id: _id } },
      }
    );
    !invite ? createError(404, "There are no invite with this ID") : null;

    res.status(200).json({ message: "Invite was canceled" });
  } catch (error) {
    next(error);
  }
};

export const blockProfile = async (req, res, next) => {
  const yourId = req.userId;
  const _id = req.body._id;

  try {
    const profileWantBlock = await User.findById(_id, { _id: 1 });

    !profileWantBlock
      ? createError(404, "There are no profile with this ID")
      : null;

    const result = await User.findOneAndUpdate(
      {
        _id: yourId,
        profilesYouBlocked: { $nin: _id },
      },
      {
        $push: {
          profilesYouBlocked: _id,
        },
        $pull: {
          friends: _id,
          friendsRequestSend: { to: _id },
          friendsRequestRecieve: { from: _id },
          sentInvitesFromGroups: { senderId: _id },
          sentInvitesFromPage: { senderId: _id },
        },
      },
      {
        new: true,
        select: "_id",
      }
    );
    !result ? createError(403, "Forbidden") : null;

    await User.updateOne({ _id: _id }, { $push: { blockedProfiles: yourId } });

    res.status(200).json({ message: `success` });
  } catch (error) {
    next(error);
  }
};
export const unblockProfile = async (req, res, next) => {
  const yourId = req.userId;
  const _id = req.body._id;

  try {
    const result = await User.findOneAndUpdate(
      {
        _id: yourId,
        profilesYouBlocked: { $in: _id },
      },
      {
        $pull: {
          profilesYouBlocked: _id,
        },
      },
      {
        new: true,
        select: "_id",
      }
    );
    !result ? createError(403, "Forbidden") : null;
    await User.updateOne({ _id: _id }, { $pull: { blockedProfiles: yourId } });

    res.status(200).json({ message: `success` });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  const yourId = req.userId;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    //init the data
    const aggregationResult = await User.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(yourId) },
      },
      {
        $project: {
          friends: 1,
          friendsRequestSend: "$friendsRequestSend.to",
          friendsRequestRecieve: "$friendsRequestRecieve.from",
          blockedProfiles: 1,
          profilesYouBlocked: 1,
          //
          groups: 1,
          //
          blockedGroups: 1, //two uses
          //
          likedPages: 1,
          blockedPages: 1,
          //
          ownedPage: 1,
          //
          backgroundPhotos: 1,
          profilePhotos: "$profilePhotos.asset",
        },
      },
      {
        $project: {
          usersWillEdit: {
            $concatArrays: [
              "$friends",
              "$friendsRequestSend",
              "$friendsRequestRecieve",
              "$blockedProfiles",
              "$profilesYouBlocked",
            ],
          },
          pagesWillEdit: { $concatArrays: ["$likedPages", "$blockedPages"] },
          groupsJoined: "$groups",
          blockedGroups: 1,
          ownedPage: 1,
          assets: { $concatArrays: ["$profilePhotos", ["$backgroundPhotos"]] },
        },
      },
    ]);
    let done = 0;

    //check if you not moderator if passed the check update the groups
    if (aggregationResult[0].groupsJoined.length > 0) {
      const group = await Group.find(
        {
          $and: [
            { _id: { $in: aggregationResult[0].groupsJoined } },
            { moderator: { $eq: yourId } },
          ],
        },
        { _id: 1 }
      );

      group.length > 0
        ? createError(
            403,
            "Forbidden - you can not delete you account because you have groups you are moderator in them"
          )
        : null;

      await Group.updateMany(
        {
          _id: { $in: aggregationResult[0].groupsJoined },
        },
        {
          $pull: {
            members: { userId: yourId },
            admins: { userId: yourId },
            membersBlocked: yourId,
          },
        },
        { session }
      );
    }

    //check from users you want edit them and edit
    if (aggregationResult[0].usersWillEdit.length > 0) {
      await User.updateMany(
        {
          _id: { $in: aggregationResult[0].usersWillEdit },
        },
        {
          $pull: {
            friends: yourId,
            friendsRequestSend: { to: yourId },
            friendsRequestRecieve: { from: yourId },
            blockedProfiles: yourId,
            profilesYouBlocked: yourId,
          },
        },
        { session }
      );
    }

    //check from pages you want edit them and edit
    if (aggregationResult[0].pagesWillEdit.length > 0) {
      await Page.updateMany(
        {
          _id: { $in: aggregationResult[0].pagesWillEdit },
        },
        {
          $pull: {
            usersLiked: yourId,
            usersBlocked: { userId: yourId },
          },
        },
        {
          session,
        }
      );
    }

    // check if you have owned pages
    //first extract ids of likers and users blocked
    // delte page
    //posts for pages will deleted from condaition post

    if (aggregationResult[0].ownedPage.length > 0) {
      const aggregationResultOwnedPages = await Page.aggregate([
        {
          $match: {
            _id: { $in: aggregationResult[0].ownedPage },
          },
        },
        { $unwind: "$usersLiked" },
        { $unwind: "$usersBlocked" },
        {
          $group: {
            _id: null,
            idsLikers: { $push: "$usersLiked" },
            idsBlocked: { $push: "$usersBlocked.userId" },
          },
        },
      ]);

      const allIds = [
        ...aggregationResultOwnedPages[0].idsLikers,
        ...aggregationResultOwnedPages[0].idsBlocked,
      ];

      const ids = [...new Set(allIds.map((id) => id.toString()))];

      await User.updateMany(
        {
          _id: { $in: ids },
        },
        {
          $pull: {
            blockedProfiles: yourId,
            likedPages: yourId,
          },
        },
        {
          session,
        }
      );

      await Page.deleteMany(
        { _id: { $in: aggregationResult[0].ownedPage } },
        { session }
      );
    }

    //now get ids post and assets for posts and posts for comments
    //after that deleted

    const posts = await Post.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(yourId),
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
    let extractedAssets = [];
    if (posts.length > 0) {
      extractedAssets = posts[0].assets;
      const extractedIds = posts[0].ids;

      //delete posts
      await Post.deleteMany({ _id: { $in: extractedIds } }, { session });
    }

    await User.deleteOne({ _id: yourId }, { session });
    done = 0;
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Operation done" });
    if (
      (extractedAssets.length > 0 || aggregationResult[0].assets.length > 0) &&
      done === 1
    ) {
      await deleteAssets([...extractedAssets, ...aggregationResult[0].assets]);
    }
  } catch (error) {
    next(error);
  }
};

export const getMainInformation = async (req, res, next) => {
  const yourId = req.userId;
  const profileId = req.params.profileId;
  const role = req.role;
  try {
    const aggregationResult = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(profileId) } },
      {
        $addFields: {
          role: role,
          isHeFriend: role === profileRoles.FRIENDS ? true : false,
          isHeOwner: role === profileRoles.OWNER ? true : false,
          canHeChangeName: {
            $cond: {
              if: { $eq: [{ $ifNull: ["$canChangeName", null] }, null] },
              then: true,
              else: {
                $cond: {
                  if: {
                    $gte: [
                      {
                        $subtract: [
                          new Date(), // Current date
                          { $toDate: "$canChangeName" }, // Convert the date field to Date type
                        ],
                      },
                      60 * 24 * 60 * 60 * 1000, // 60 days in milliseconds
                    ],
                  },
                  then: true, // If the difference is greater than or equal to 60 days, allow the change
                  else: false, // If the difference is less than 60 days, disallow the change
                },
              },
            },
          },
          areYouSendFriendRequestToHim: {
            $cond: {
              if: { $eq: [role, profileRoles.OWNER] },
              then: false,
              else: {
                $cond: {
                  if: { $in: [yourId, "$friendsRequestRecieve.from"] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          isHeSendFriendRequestToYou: {
            $cond: {
              if: { $eq: [role, profileRoles.OWNER] },
              then: false,
              else: {
                $cond: {
                  if: { $in: [yourId, "$friendsRequestSend.to"] },
                  then: true,
                  else: false,
                },
              },
            },
          },
        },
      },
      {
        $project: {
          role: 1,
          isHeFriend: 1,
          isHeOwner: 1,
          firstName: 1,
          lastName: 1,
          birthDay: 1,
          gender: 1,
          bio: 1,
          profilePhotos: 1,
          backgroundPhotos: 1,
          education: 1,
          phoneNumber: 1,
          placesLived: 1,
          email: {
            $cond: {
              if: { $eq: ["$role", profileRoles.OWNER] },
              then: "$email",
              else: "$$REMOVE",
            },
          },
          canHeChangeName: {
            $cond: {
              if: { $eq: ["$role", profileRoles.OWNER] },
              then: "$canHeChangeName",
              else: "$$REMOVE",
            },
          },
          areYouSendFriendRequestToHim: 1,
          isHeSendFriendRequestToYou: 1,
        },
      },
    ]);
    res.status(200).json({ mainInfo: aggregationResult });
  } catch (error) {
    next(error);
  }
};

export const getProfilePosts = async (req, res, next) => {
  const profileId = req.params.profileId;
  const yourId = req.userId;
  const role = req.role;
  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;

  try {
    const aggregationResult = await Post.aggregate(
      posts(profileId, role, yourId, ITEMS_PER_PAGE, page)
    );

    const totalPosts = aggregationResult[0].totalCount;

    //role mean are you owner of posts or not for edit or delete
    res.status(200).json({
      role: role,
      posts: aggregationResult[0].posts,
      extraInfo: information(totalPosts, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};

export const getFriends = async (req, res, next) => {
  const profileId = req.params.profileId;

  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;
  const profilesYouBlocked = req.profilesYouBlocked;
  const blockedProfiles = req.blockedProfiles;

  try {
    const aggregationResult = await User.aggregate(
      friends(
        profileId,
        profilesYouBlocked,
        blockedProfiles,
        page,
        ITEMS_PER_PAGE
      )
    );

    const totalFriends = aggregationResult[0].totalCount;

    res.status(200).json({
      followers: aggregationResult[0].allFriends,
      extraInfo: information(totalFriends, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};

export const getFriendsRequestSentToMe = async (req, res, next) => {
  const profileId = req.params.profileId;
  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;
  const role = req.role;
  try {
    role !== profileRoles.OWNER ? createError(403, "Forbidden") : null;

    const aggregationResult = await User.aggregate(
      friendsRequestSentToMe(profileId, page, ITEMS_PER_PAGE)
    );

    const totalfriendsRequestRecieve = aggregationResult[0].totalCount;

    res.status(200).json({
      friendsRequestRecieve: aggregationResult[0].friendsRequestRecieve,
      extraInfo: information(totalfriendsRequestRecieve, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};
export const getFriendsRequestSentByMe = async (req, res, next) => {
  const profileId = req.params.profileId;
  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;
  const role = req.role;
  try {
    role !== profileRoles.OWNER ? createError(403, "Forbidden") : null;

    const aggregationResult = await User.aggregate(
      friendsRequestSentByMe(profileId, page, ITEMS_PER_PAGE)
    );

    const totalfriendsRequestSend = aggregationResult[0].totalCount;

    res.status(200).json({
      friendsRequestSend: aggregationResult[0].friendsRequestSend,
      extraInfo: information(totalfriendsRequestSend, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};

export const getPagesLiked = async (req, res, next) => {
  const profileId = req.params.profileId;

  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;
  const blockedPages = req.blockedPages;
  try {
    const aggregationResult = await User.aggregate(
      pagesLiked(profileId, blockedPages, page, ITEMS_PER_PAGE)
    );

    const totalPages = aggregationResult[0].totalCount;

    res.status(200).json({
      pages: aggregationResult[0].allPages,
      extraInfo: information(totalPages, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};
export const getPagesIOwned = async (req, res, next) => {
  const profileId = req.params.profileId;

  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;
  const role = req.role;
  try {
    role !== profileRoles.OWNER ? createError(403, "Forbidden") : null;
    const aggregationResult = await User.aggregate(
      pagesIOwned(profileId, page, ITEMS_PER_PAGE)
    );

    const totalPages = aggregationResult[0].totalCount;

    res.status(200).json({
      pages: aggregationResult[0].allPages,
      extraInfo: information(totalPages, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};
export const getGroupsJoined = async (req, res, next) => {
  const profileId = req.params.profileId;

  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;
  const yourId = req.userId;

  const yourProfile = await User.findById(yourId, {
    "sentInvitesFromGroups.groupId": 1,
  });
  const IdsGroup = yourProfile.sentInvitesFromGroups.map((id) =>
    id.groupId.toString()
  );

  const UniqueIds = [...new Set(IdsGroup)];

  try {
    const aggregationResult = await User.aggregate(
      GroupsJoined(profileId, page, ITEMS_PER_PAGE, yourId, UniqueIds)
    );
console.log(aggregationResult)
    const totalGroups = aggregationResult[0].totalCount;

    res.status(200).json({
      groups: aggregationResult[0].allGroups,
      extraInfo: information(totalGroups, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};
export const getInvitationsSentToMeFromGroups = async (req, res, next) => {
  const profileId = req.params.profileId;
  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;

  const role = req.role;
  try {
    role !== profileRoles.OWNER ? createError(403, "Forbidden") : null;

    const aggregationResult = await User.aggregate(
      invitationsSentToMeFromGroups(profileId, page, ITEMS_PER_PAGE)
    );

    const totalsentInvitesFromGroups = aggregationResult[0].totalCount;

    res.status(200).json({
      Invites: aggregationResult[0].sentInvitesFromGroups,
      extraInfo: information(totalsentInvitesFromGroups, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};
export const getInvitationsSentToMeFromPages = async (req, res, next) => {
  const profileId = req.params.profileId;
  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;

  const role = req.role;
  try {
    role !== profileRoles.OWNER ? createError(403, "Forbidden") : null;

    const aggregationResult = await User.aggregate(
      invitationsSentToMeFromPages(profileId, page, ITEMS_PER_PAGE)
    );
    console.log(aggregationResult);
    const totalsentInvitesFromPages = aggregationResult[0].totalCount;

    res.status(200).json({
      Invites: aggregationResult[0].sentInvitesFromPage,
      extraInfo: information(totalsentInvitesFromPages, page, ITEMS_PER_PAGE),
    });
  } catch (error) {
    next(error);
  }
};

export const getPostsFromAll = async (req, res, next) => {
  const yourId = req.userId;
  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;
  try {
    const yourProfile = await User.findById(yourId, {
      groups: 1,
      likedPages: 1,
      friends: 1,
      ownedPage: 1,
      blockedProfiles: 1,
      profilesYouBlocked: 1,
    });

    const aggregationResult = await Post.aggregate(
      postFromAll(
        yourProfile.groups,
        yourProfile.likedPages,
        yourProfile.ownedPage,
        yourProfile.friends,
        yourId,
        yourProfile.blockedProfiles,
        yourProfile.profilesYouBlocked,
        page,
        ITEMS_PER_PAGE
      )
    );

    return res.json({ aggregationResult });
  } catch (error) {
    next(error);
  }
};

export const searchAboutPepole = async (req, res, next) => {
  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;
  const query = req.query.query || "";
  const yourId = req.userId;
  try {
    query.toString().length < 3
      ? createError(422, "Should be with length 3 and up ")
      : null;

    const aggregationResult = await User.aggregate(
      pepole(query, yourId, page, ITEMS_PER_PAGE)
    );

    res.json(aggregationResult);
  } catch (error) {
    next(error);
  }
};

export const searchAboutPages = async (req, res, next) => {
  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;
  const query = req.query.query || "";
  const yourId = req.userId;

  try {
    const aggregationResult = await Page.aggregate(
      pages(query, yourId, page, ITEMS_PER_PAGE)
    );

    res.status(200).json({ aggregationResult });
  } catch (error) {
    next(error);
  }
};

export const searchAboutGroups = async (req, res, next) => {
  const ITEMS_PER_PAGE = 20;
  const page = +req.query.page || 1;
  const query = req.query.query || "";
  const yourId = req.userId;

  try {
    const yourProfile = await User.findById(yourId, {
      "sentInvitesFromGroups.groupId": 1,
    });
    const IdsGroup = yourProfile.sentInvitesFromGroups.map((id) =>
      id.groupId.toString()
    );

    const UniqueIds = [...new Set(IdsGroup)];

    const aggregationResult = await Group.aggregate(
      groups(query, yourId, UniqueIds, page, ITEMS_PER_PAGE)
    );

    res.status(200).json({ aggregationResult });
  } catch (error) {
    next(error);
  }
};

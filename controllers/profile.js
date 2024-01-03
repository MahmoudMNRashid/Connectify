import mongoose from "mongoose";
import { validationResult } from "express-validator";

import User from "../models/user.js";
import {
  deleteAssets,
  fileFilterPhotosAndVideos,
  uploadAssets,
} from "../util/file.js";
import user from "../models/user.js";

export const updateProfilePhoto = async (req, res, next) => {
  const newPhoto = req.files;
  const userId = req.userId;
  const publidIdForOldPhoto = req.body.publicId;

  try {
    const user = await User.findById({
      _id: new mongoose.Types.ObjectId(userId),
    });
    if (!user) {
      const error = new Error("not Auth");
      error.statusCode = 401;
      throw error;
    }

    if (newPhoto.length > 0 && publidIdForOldPhoto) {
      const error = new Error("You can not send new photo and old photo");
      error.statusCode = 422;
      throw error;
    }
    if (!newPhoto || newPhoto.length > 1) {
      const error = new Error("Please upload one Profile photo please ");
      error.statusCode = 422;
      throw error;
    }

    //here you can upload photo to cloudinary and update database
    if (newPhoto.length > 0) {
      fileFilterPhotosAndVideos(newPhoto);
      const linkAndTypeForPhoto = await uploadAssets(
        newPhoto,
        1,
        "Assets from profile"
      );

      const newProfilePhoto = {
        ...linkAndTypeForPhoto[0],
        createdAt: new Date().toISOString(),
      };
      const previousBackgroundpPhoto = user.profilePhotos;
      previousBackgroundpPhoto.push(newProfilePhoto);
      user.profilePhotos = previousBackgroundpPhoto;
      await user.save();

      res.status(201).json({
        message: "Profile photo was updated",
        link: newProfilePhoto,
      });
    }

    if (publidIdForOldPhoto) {
      const previousProfilePhoto = user.profilePhotos;

      const oldPhotoFromDb = previousProfilePhoto.find(
        (obj) => obj.public_id === publidIdForOldPhoto
      );

      if (!oldPhotoFromDb) {
        const error = new Error("Invalid public id");
        error.statusCode = 422;
        throw error;
      }
      const updatedOldPhoto = {
        ...oldPhotoFromDb,
        createdAt: new Date().toISOString(),
      };
      const allPhotoWithoutOldPhoto = previousProfilePhoto.filter((obj) => {
        return obj.public_id !== publidIdForOldPhoto;
      });

      const newPhotosArray = allPhotoWithoutOldPhoto;
      newPhotosArray.push(updatedOldPhoto);
      user.profilePhotos = newPhotosArray;
      await user.save();
      res.status(201).json({
        message: "Profile photo was updated",
        link: updatedOldPhoto,
      });
    }
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const updateProfileBio = async (req, res, next) => {
  const userId = req.userId;
  const bio = req.body.bio;
  try {
    const user = await User.findById({
      _id: new mongoose.Types.ObjectId(userId),
    });
    if (!user) {
      const error = new Error("not Auth");
      error.statusCode = 401;
      throw error;
    }

    if (!bio) {
      const error = new Error("Empty bio");
      error.statusCode = 422;
      throw error;
    }

    //here update bio

    user.bio = bio;
    await user.save();
    res.status(201).json({ message: "Bio was updated", bio });
  } catch (error) {}
};

export const updateProfileBackgroundPhoto = async (req, res, next) => {
  const newPhoto = req.files;
  const userId = req.userId;
  const publidIdForOldPhoto = req.body.publicId;

  try {
    const user = await User.findById({
      _id: new mongoose.Types.ObjectId(userId),
    });
    if (!user) {
      const error = new Error("not Auth");
      error.statusCode = 401;
      throw error;
    }

    if (newPhoto.length > 0 && publidIdForOldPhoto) {
      const error = new Error("You can not send new photo and old photo");
      error.statusCode = 422;
      throw error;
    }
    if (!newPhoto || newPhoto.length > 1) {
      const error = new Error("Please upload one backgroundPhoto please ");
      error.statusCode = 422;
      throw error;
    }

    //here you can upload photo to cloudinary and update database
    if (newPhoto.length > 0) {
      fileFilterPhotosAndVideos(newPhoto);
      const linkAndTypeForPhoto = await uploadAssets(
        newPhoto,
        1,
        "Assets from profile"
      );

      const newBackgroundphoto = {
        ...linkAndTypeForPhoto[0],
        createdAt: new Date().toISOString(),
      };
      const previousBackgroundpPhoto = user.backgroundPhotos;
      previousBackgroundpPhoto.push(newBackgroundphoto);
      user.backgroundPhotos = previousBackgroundpPhoto;
      await user.save();

      res.status(201).json({
        message: "backgroundPhoto was updated",
        link: newBackgroundphoto,
      });
    }

    if (publidIdForOldPhoto) {
      const previousBackgroundpPhoto = user.backgroundPhotos;
      console.log(previousBackgroundpPhoto);
      const oldPhotoFromDb = previousBackgroundpPhoto.find(
        (obj) => obj.public_id === publidIdForOldPhoto
      );
      console.log(oldPhotoFromDb);
      if (!oldPhotoFromDb) {
        const error = new Error("Invalid public id");
        error.statusCode = 422;
        throw error;
      }
      const updatedOldPhoto = {
        ...oldPhotoFromDb,
        createdAt: new Date().toISOString(),
      };
      const allPhotoWithoutOldPhoto = previousBackgroundpPhoto.filter((obj) => {
        return obj.public_id !== publidIdForOldPhoto;
      });

      const newPhotosArray = allPhotoWithoutOldPhoto;
      newPhotosArray.push(updatedOldPhoto);
      user.backgroundPhotos = newPhotosArray;
      await user.save();
      res.status(201).json({
        message: "backgroundPhoto was updated",
        link: updatedOldPhoto,
      });
    }
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const updateProfileBirthday = async (req, res, next) => {
  const errors = validationResult(req);
  const userId = req.userId;
  const birthday = req.body.birthday;
  console.log(birthday);
  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation of birthday failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("Not auth");
      error.statusCode = 401;
      throw error;
    }

    //here update the birthday
    user.birthDay = birthday;
    await user.save();

    res.status(201).json({ message: "Birthday was updated" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
export const updateProfileGender = async (req, res, next) => {
  const errors = validationResult(req);
  const userId = req.userId;
  const gender = req.body.gender;

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation of gender failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("Not auth");
      error.statusCode = 401;
      throw error;
    }

    //here update the birthday
    user.gender = gender;
    await user.save();

    res.status(201).json({ message: "gender was updated" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const updateFirstAndLastName = async (req, res, next) => {
  const errors = validationResult(req);
  const userId = req.userId;
  const newfirstName = req.body.newFirstName;
  const newlastName = req.body.newLastName;

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation of firstname or lastname failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("Not auth");
      error.statusCode = 401;
      throw error;
    }

    //here you can change your name
    const lastChangeDate = user.canChangeName;

    if (lastChangeDate) {
      const currentDate = new Date();

      // Calculate age
      const days = Math.floor(
        (currentDate - lastChangeDate) / (365.25 * 24 * 60 * 60 * 1000)
      );

      if (days < 60) {
        const error = new Error(
          `You can not change your name before 60 days you need wait ${
            60 - days
          } days`
        );
        error.statusCode = 403;
        throw error;
      } else {
        user.firstName = newfirstName;
        user.lastName = newlastName;
        user.canChangeName = new Date();
        await user.save();
        res.status(201).json({ message: "Your name was updated" });
      }
    } else {
      user.firstName = newfirstName;
      user.lastName = newlastName;
      user.canChangeName = new Date();
      await user.save();
      res.status(201).json({ message: "Your name was updated" });
    }
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const deleteProfilePhoto = async (req, res, next) => {
  const userId = req.userId;
  const publicIdForPhoto = req.body.publicId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("not Auth");
      error.statusCode = 401;
      throw error;
    }

    if (!publicIdForPhoto) {
      const error = new Error("Please  send the public id");
      error.statusCode = 404;
      throw error;
    }

    const ProfilePhotosFromDb = user.profilePhotos;

    const allInformationAboutPublicId = ProfilePhotosFromDb.find((obj) => {
      return obj.public_id === publicIdForPhoto;
    });

    if (!allInformationAboutPublicId) {
      const error = new Error("public id not found");
      error.statusCode = 404;
      throw error;
    }
    const newProfilePhotos = ProfilePhotosFromDb.filter(
      (obj) => obj.public_id !== publicIdForPhoto
    );

    await deleteAssets([allInformationAboutPublicId]);
    user.profilePhotos = newProfilePhotos;
    await user.save();
    res.status(200).json({ message: "Photo was deleted" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
export const deleteProfileBackgroundPhoto = async (req, res, next) => {
  const userId = req.userId;
  const publicIdForPhoto = req.body.publicId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("not Auth");
      error.statusCode = 401;
      throw error;
    }

    if (!publicIdForPhoto) {
      const error = new Error("Please  send the public id");
      error.statusCode = 404;
      throw error;
    }

    const BackgroundPhotosFromDb = user.backgroundPhotos;

    const allInformationAboutPublicId = BackgroundPhotosFromDb.find((obj) => {
      return obj.public_id === publicIdForPhoto;
    });

    if (!allInformationAboutPublicId) {
      const error = new Error("public id not found");
      error.statusCode = 404;
      throw error;
    }
    const newProfilePhotos = BackgroundPhotosFromDb.filter(
      (obj) => obj.public_id !== publicIdForPhoto
    );

    await deleteAssets([allInformationAboutPublicId]);
    user.backgroundPhotos = newProfilePhotos;
    await user.save();
    res.status(200).json({ message: "Photo was deleted" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const addEducationCollege = async (req, res, next) => {
  const errors = validationResult(req);
  const userId = req.userId;
  const nameofCollege = req.body.nameofCollege;
  const graduated = req.body.graduated;

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation of College failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("not Auth");
      error.statusCode = 401;
      throw error;
    }
    const college = { name: nameofCollege, graduated: graduated };
    //here you can add
    user.education.college.push(college);
    await user.save();
    res.status(201).json({ message: "college was added" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
export const updateEducationCollege = async (req, res, next) => {
  const errors = validationResult(req);
  const userId = req.userId;
  const idCollege = req.body.id;
  const nameofCollege = req.body.nameofCollege;
  const graduated = req.body.graduated;

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation of College failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("not Auth");
      error.statusCode = 401;
      throw error;
    }

    const collegeFromDb = user.education.college.find(
      (obj) => obj._id.toString() === idCollege
    );
    if (!collegeFromDb) {
      const error = new Error("Id of College not found");
      error.statusCode = 404;
      throw error;
    }

    const collegesWithoutoldCollege = user.education.college.filter(
      (obj) => obj._id.toString() !== idCollege
    );
    const updatedcollege = {
      ...collegeFromDb,
      name: nameofCollege,
      graduated: graduated,
    };
    collegesWithoutoldCollege.push(updatedcollege);
    user.education.college = collegesWithoutoldCollege;
    await user.save();
    res.status(200).json({ message: "college was updated" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const addEducationHighSchool = async (req, res, next) => {
  const errors = validationResult(req);
  const userId = req.userId;
  const nameofHighSchool = req.body.nameofHighSchool;
  const year = req.body.year;

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation of high school failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("not Auth");
      error.statusCode = 401;
      throw error;
    }
    const highSchool = { name: nameofHighSchool, year: year };
    //here you can add
    user.education.highSchool.push(highSchool);
    await user.save();
    res.status(201).json({ message: "High school was added" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
export const updateEducationHighSchool = async (req, res, next) => {
  const errors = validationResult(req);
  const userId = req.userId;
  const idHighSchool = req.body.id;
  const nameofHighSchool = req.body.nameofHighSchool;
  const year = req.body.year;

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation of high school failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("not Auth");
      error.statusCode = 401;
      throw error;
    }

    const highSchoolFromDb = user.education.highSchool.find(
      (obj) => obj._id.toString() === idHighSchool
    );
    if (!highSchoolFromDb) {
      const error = new Error("Id of high school not found");
      error.statusCode = 404;
      throw error;
    }

    const HighSchoolsWithoutoldHighSchool = user.education.highSchool.filter(
      (obj) => obj._id.toString() !== idHighSchool
    );
    const updatedHighSchool = {
      ...highSchoolFromDb,
      name: nameofHighSchool,
      year: year,
    };
    HighSchoolsWithoutoldHighSchool.push(updatedHighSchool);
    user.education.highSchool = HighSchoolsWithoutoldHighSchool;
    await user.save();
    res.status(200).json({ message: "high School was updated" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const deleteEducationCollege = async (req, res, next) => {
  const userId = req.userId;
  const idCollege = req.body.idCollege;

  try {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("not Auth");
      error.statusCode = 401;
      throw error;
    }

    const collegsFromDb = user.education.college;
    const isIdFound = collegsFromDb.find(
      (obj) => obj._id.toString() === idCollege
    );

    if (!isIdFound) {
      const error = new Error("Id not found");
      error.statusCode = 404;
      throw error;
    }

    const newCollegs = collegsFromDb.filter(
      (obj) => obj._id.toString() !== idCollege
    );
    user.education.college = newCollegs;
    await user.save();
    res.status(200).json({ message: "College was deleted" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
export const deleteEducationHighSchool = async (req, res, next) => {
  const userId = req.userId;
  const idHighSchool = req.body.idHighSchool;

  try {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("not Auth");
      error.statusCode = 401;
      throw error;
    }

    const HighSchoolsFromDb = user.education.highSchool;
    const isIdFound = HighSchoolsFromDb.find(
      (obj) => obj._id.toString() === idHighSchool
    );

    if (!isIdFound) {
      const error = new Error("Id not found");
      error.statusCode = 404;
      throw error;
    }

    const newHighSchools = HighSchoolsFromDb.filter(
      (obj) => obj._id.toString() !== idHighSchool
    );
    user.education.highSchool = newHighSchools;
    await user.save();
    res.status(200).json({ message: "High School was deleted" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const addCurrentCity = async (req, res, next) => {
  const errors = validationResult(req);
  const userId = req.userId;
  const nameOfCity = req.body.name;
  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation of city name  failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const user = await User.findById(userId);

    if (!user) {
      const error = new Error("not Auth");
      error.statusCode = 401;
      throw error;
    }

    if (user.placesLived.currentCity.length > 0) {
      const error = new Error(
        "You can not add city ,because you already added one"
      );
      error.statusCode = 403;
      throw error;
    }

    user.placesLived.currentCity.push({ name: nameOfCity });
    await user.save();
    res.status(201).json({ message: "Your city was added" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
export const updateCurrentCity = async (req, res, next) => {
  const errors = validationResult(req);
  const userId = req.userId;
  const nameOfCity = req.body.name;
  const idOfCity = req.body.id;
  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation of city name  failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const user = await User.findById(userId);

    if (!user) {
      const error = new Error("not Auth");
      error.statusCode = 401;
      throw error;
    }

    const isIdOfCityFound = user.placesLived.currentCity.find(
      (obj) => obj._id.toString() === idOfCity
    );
    if (!isIdOfCityFound) {
      const error = new Error("Id of city does not found");
      error.statusCode = 404;
      throw error;
    }

    user.placesLived.currentCity[0].name = nameOfCity;
    await user.save();
    res.status(200).json({ message: "Your city was updated" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
export const deleteCurrentCity = async (req, res, next) => {
  const userId = req.userId;
  const idOfCity = req.body.id;
  try {
    const user = await User.findById(userId);

    if (!user) {
      const error = new Error("not Auth");
      error.statusCode = 401;
      throw error;
    }

    const isIdOfCityFound = user.placesLived.currentCity.find(
      (obj) => obj._id.toString() === idOfCity
    );
    if (!isIdOfCityFound) {
      const error = new Error("Id of city does not found");
      error.statusCode = 404;
      throw error;
    }

    user.placesLived.currentCity.pop();
    await user.save();
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
  const userId = req.userId;
  const nameOfHometown = req.body.name;
  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation of hometown name  failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const user = await User.findById(userId);

    if (!user) {
      const error = new Error("not Auth");
      error.statusCode = 401;
      throw error;
    }

    if (user.placesLived.homeTown.length > 0) {
      const error = new Error(
        "You can not add hometown ,because you already added one"
      );
      error.statusCode = 403;
      throw error;
    }

    user.placesLived.homeTown.push({ name: nameOfHometown });
    await user.save();
    res.status(201).json({ message: "Your homwtown was added" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
export const updateHometown = async (req, res, next) => {
  const errors = validationResult(req);
  const userId = req.userId;
  const nameOfHometown = req.body.name;
  const idOfHometown = req.body.id;
  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation of hometown name  failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const user = await User.findById(userId);

    if (!user) {
      const error = new Error("not Auth");
      error.statusCode = 401;
      throw error;
    }

    const isIdOfHometownFound = user.placesLived.homeTown.find(
      (obj) => obj._id.toString() === idOfHometown
    );
    if (!isIdOfHometownFound) {
      const error = new Error("Id of city does not found");
      error.statusCode = 404;
      throw error;
    }

    user.placesLived.homeTown[0].name = nameOfHometown;
    await user.save();
    res.status(200).json({ message: "Your hometown name was updated" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
export const deleteHometown = async (req, res, next) => {
  const userId = req.userId;
  const idOfHometown = req.body.id;
  try {
    const user = await User.findById(userId);

    if (!user) {
      const error = new Error("not Auth");
      error.statusCode = 401;
      throw error;
    }

    const isIdOfHometownFound = user.placesLived.homeTown.find(
      (obj) => obj._id.toString() === idOfHometown
    );
    if (!isIdOfHometownFound) {
      const error = new Error("Id of Hometown does not found");
      error.statusCode = 404;
      throw error;
    }

    user.placesLived.homeTown.pop();
    await user.save();
    res.status(200).json({ message: "Your hometown was deleted" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const addPhoneNumber = async (req, res, next) => {
  const errors = validationResult(req);
  const userId = req.userId;
  const phoneNumber = req.body.phoneNumber;

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation of College failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const user = await User.findById(userId);

    if (!user) {
      const error = new Error("not Auth");
      error.statusCode = 401;
      throw error;
    }

    user.phoneNumber = phoneNumber;
    await user.save();
    res.status(201).json({ message: "Your phone number was added" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
export const updatePhoneNumber = async (req, res, next) => {
  const errors = validationResult(req);
  const userId = req.userId;
  const phoneNumber = req.body.phoneNumber;

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation of College failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const user = await User.findById(userId);

    if (!user) {
      const error = new Error("not Auth");
      error.statusCode = 401;
      throw error;
    }
    if (!user.phoneNumber) {
      const error = new Error("No phone number found to delete");
      error.statusCode = 404;
      throw error;
    }
    user.phoneNumber = phoneNumber;
    await user.save();
    res.status(201).json({ message: "Your phone number was updated" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
export const deletePhoneNumber = async (req, res, next) => {
  const userId = req.userId;

  try {
    const user = await User.findById(userId);

    if (!user) {
      const error = new Error("not Auth");
      error.statusCode = 401;
      throw error;
    }

    if (!user.phoneNumber) {
      const error = new Error("No phone number found to delete");
      error.statusCode = 404;
      throw error;
    }
    user.phoneNumber = undefined;
    await user.save();
    res.status(200).json({ message: "Your phone number was deleted" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const sendFriendRequest = async (req, res, next) => {
  const idSender = req.userId; //sender
  const idReciver = req.body.IdReciver;

  try {
    const userSender = await User.findById(idSender, {
      firstName: 1,
      lastName: 1,
      friends: 1,
      friendsRequestSend: 1,
      friendsRequestRecieve: 1,
    });
    const userReciver = await User.findById(idReciver, {
      firstName: 1,
      lastName: 1,
      friends: 1,
      friendsRequestSend: 1,
      friendsRequestRecieve: 1,
    });

    if (!userSender) {
      const error = new Error("Not auth");
      error.statusCode = 401;
      throw error;
    }

    if (!userReciver) {
      const error = new Error("Id of reciver not found");
      error.statusCode = 404;
      throw error;
    }

    if (idSender === idReciver) {
      const error = new Error("Error in implemention");
      error.statusCode = 400;
      throw error;
    }
    //you can check from
    const isIdOfReciverInFriendsSender = userSender.friends.find(
      (obj) => obj._id.toString() === idReciver
    );

    if (isIdOfReciverInFriendsSender) {
      const error = new Error(
        `You already friend with Reciver:${userReciver.firstName} ${userReciver.lastName}`
      );
      error.statusCode = 400;
      throw error;
    }

    const isIdOfReciverInFriendsRequestSendForSender =
      userSender.friendsRequestSend.find(
        (obj) => obj._id.toString() === idReciver
      );

    if (isIdOfReciverInFriendsRequestSendForSender) {
      const error = new Error(
        `You already sent request to ${userReciver.firstName} ${userReciver.lastName} `
      );
      error.statusCode = 400;
      throw error;
    }

    const isIdOfReciverInFriendsRequestReciveForSender =
      userSender.friendsRequestRecieve.find(
        (obj) => obj._id.toString() === idReciver
      );

    if (isIdOfReciverInFriendsRequestReciveForSender) {
      const error = new Error(
        ` ${userReciver.firstName} ${userReciver.lastName}  already sent request to you   `
      );
      error.statusCode = 400;
      throw error;
    }

    userSender.friendsRequestSend.push(new mongoose.Types.ObjectId(idReciver));
    userReciver.friendsRequestRecieve.push(
      new mongoose.Types.ObjectId(idSender)
    );
    await userSender.save();
    await userReciver.save();

    res.status(200).json({ message: "Your Request was send" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const acceptFriendRequest = async (req, res, next) => {
  const idSender = req.body.idSender; //sender
  const idReciver = req.userId;
  try {
    const userReciver = await User.findById(idReciver, {
      firstName: 1,
      lastName: 1,
      friends: 1,
      friendsRequestSend: 1,
      friendsRequestRecieve: 1,
    });
    const userSender = await User.findById(idSender, {
      firstName: 1,
      lastName: 1,
      friends: 1,
      friendsRequestSend: 1,
      friendsRequestRecieve: 1,
    });

    console.log(userSender);
    if (!userReciver) {
      const error = new Error("Not auth");
      error.statusCode = 401;
      throw error;
    }

    if (!userSender) {
      const error = new Error("Id of sender not found");
      error.statusCode = 404;
      throw error;
    }

    if (idSender === idReciver) {
      const error = new Error("Error in implemention");
      error.statusCode = 400;
      throw error;
    }

    const isIdOfSenderInFriendsReciver = userReciver.friends.find(
      (obj) => obj._id.toString() === idSender
    );

    if (isIdOfSenderInFriendsReciver) {
      const error = new Error(
        `Error in implemention ` //how accept req friend and he already friends with you ,this can be happen if your logic not true
      );
      error.statusCode = 400;
      throw error;
    }

    const isIdOfSenderInFriendsRequestSendForReciver =
      userReciver.friendsRequestSend.find(
        (obj) => obj._id.toString() === idSender
      );

    if (isIdOfSenderInFriendsRequestSendForReciver) {
      const error = new Error(
        ` Error in implemention ` //how you want accept friend and you sent req for this friend again this can be happen if you logic not valid
      );
      error.statusCode = 400;
      throw error;
    }

    const isIdOfSenderInFriendsRequestReciveForReciver =
      userReciver.friendsRequestRecieve.find(
        (obj) => obj._id.toString() === idSender
      );

    if (!isIdOfSenderInFriendsRequestReciveForReciver) {
      const error = new Error(
        ` ${userSender.firstName} ${userSender.lastName} does not sent request to you   ` // error in logic in your code again
      );
      error.statusCode = 400;
      throw error;
    }

    //for person accept the request
    const newArrayForFriendsRequestRecieveForReciver =
      userReciver.friendsRequestRecieve.filter(
        (obj) => obj._id.toString() !== idSender
      );

    userReciver.friends.push(new mongoose.Types.ObjectId(idSender));

    //for person send the request

    const newArrayForFriendsRequestSendForSender =
      userSender.friendsRequestSend.filter(
        (obj) => obj._id.toString() !== idReciver
      );
    userSender.friends.push(new mongoose.Types.ObjectId(idReciver));

    //edit all array in db for sender and reciver

    userReciver.friendsRequestRecieve =
      newArrayForFriendsRequestRecieveForReciver;
    userSender.friendsRequestSend = newArrayForFriendsRequestSendForSender;

    await userReciver.save();
    await userSender.save();

    res.status(200).json({
      message: `Request friend was accepted,${userSender.firstName}  ${userSender.lastName} become your friend`,
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const cancelFriendRequest = async (req, res, next) => {
  const idSender = req.body.idSender; //sender
  const idReciver = req.userId;
  try {
    const userReciver = await User.findById(idReciver, {
      firstName: 1,
      lastName: 1,
      friends: 1,
      friendsRequestSend: 1,
      friendsRequestRecieve: 1,
    });
    const userSender = await User.findById(idSender, {
      firstName: 1,
      lastName: 1,
      friends: 1,
      friendsRequestSend: 1,
      friendsRequestRecieve: 1,
    });

    if (!userReciver) {
      const error = new Error("Not auth");
      error.statusCode = 401;
      throw error;
    }

    if (!userSender) {
      const error = new Error("Id of sender not found");
      error.statusCode = 404;
      throw error;
    }

    if (idSender === idReciver) {
      const error = new Error("Error in implemention");
      error.statusCode = 400;
      throw error;
    }

    const isIdOfSenderInFriendsReciver = userReciver.friends.find(
      (obj) => obj._id.toString() === idSender
    );

    if (isIdOfSenderInFriendsReciver) {
      const error = new Error(
        `Error in implemention ` //how accept req friend and he already friends with you ,this can be happen if your logic not true
      );
      error.statusCode = 400;
      throw error;
    }

    const isIdOfSenderInFriendsRequestSendForReciver =
      userReciver.friendsRequestSend.find(
        (obj) => obj._id.toString() === idSender
      );

    if (isIdOfSenderInFriendsRequestSendForReciver) {
      const error = new Error(
        ` Error in implemention ` //how you want accept friend and you sent req for this friend again this can be happen if you logic not valid
      );
      error.statusCode = 400;
      throw error;
    }

    const isIdOfSenderInFriendsRequestReciveForReciver =
      userReciver.friendsRequestRecieve.find(
        (obj) => obj._id.toString() === idSender
      );

    if (!isIdOfSenderInFriendsRequestReciveForReciver) {
      const error = new Error(
        ` ${userSender.firstName} ${userSender.lastName} does not sent request to you   ` // error in logic in your code again
      );
      error.statusCode = 400;
      throw error;
    }

    //for person accept the request
    const newArrayForFriendsRequestRecieveForReciver =
      userReciver.friendsRequestRecieve.filter(
        (obj) => obj._id.toString() !== idSender
      );

    //for person send the request

    const newArrayForFriendsRequestSendForSender =
      userSender.friendsRequestSend.filter(
        (obj) => obj._id.toString() !== idReciver
      );

    //edit all array in db for sender and reciver

    userReciver.friendsRequestRecieve =
      newArrayForFriendsRequestRecieveForReciver;
    userSender.friendsRequestSend = newArrayForFriendsRequestSendForSender;

    await userReciver.save();
    await userSender.save();

    res.status(200).json({
      message: `Request friend was canceled`,
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const unfriend = async (req, res, next) => {
  const idFriend = req.body.idFriend;
  const YourId = req.userId;
  try {
    const yourFriend = await User.findById(idFriend, {
      firstName: 1,
      lastName: 1,
      friends: 1,
      friendsRequestSend: 1,
      friendsRequestRecieve: 1,
    });
    const you = await User.findById(YourId, {
      firstName: 1,
      lastName: 1,
      friends: 1,
      friendsRequestSend: 1,
      friendsRequestRecieve: 1,
    });

    if (!you) {
      const error = new Error("Not auth");
      error.statusCode = 401;
      throw error;
    }

    if (!yourFriend) {
      const error = new Error("Id of your friend not found");
      error.statusCode = 404;
      throw error;
    }

    if (YourId === idFriend) {
      const error = new Error("Error in implemention");
      error.statusCode = 400;
      throw error;
    }

    const isIdOfYourFriendInYourFriendsArray = you.friends.find(
      (obj) => obj._id.toString() === idFriend
    );

    if (!isIdOfYourFriendInYourFriendsArray) {
      const error = new Error(
        `Error in implemention - not your friend ` //how accept req friend and he already friends with you ,this can be happen if your logic not true
      );
      error.statusCode = 400;
      throw error;
    }
    const isIdOfYouInFriendsArrayOfYourFriend = yourFriend.friends.find(
      (obj) => obj._id.toString() === YourId
    );

    if (!isIdOfYouInFriendsArrayOfYourFriend) {
      const error = new Error(
        `Error in implemention - not your friend. ` //how accept req friend and he already friends with you ,this can be happen if your logic not true
      );
      error.statusCode = 400;
      throw error;
    }

    //for person accept the request
    const newYourArrayfriendsAfterUnfriend = you.friends.filter(
      (obj) => obj._id.toString() !== idFriend
    );

    //for person send the request

    const newArrayfriendsAfterUnfriendForYourFriend = yourFriend.friends.filter(
      (obj) => obj._id.toString() !== YourId
    );

    //edit all array in db for sender and reciver

    you.friends = newYourArrayfriendsAfterUnfriend;
    yourFriend.friends = newArrayfriendsAfterUnfriendForYourFriend;

    await you.save();
    await yourFriend.save();

    res.status(200).json({
      message: `You and ${yourFriend.firstName}  ${yourFriend.lastName} become no friend`,
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

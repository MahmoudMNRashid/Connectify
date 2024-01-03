import express from "express";
import { body } from "express-validator";
import { isAuth } from "../middleware/is-Auth.js";
import {
  updateProfilePhoto as updateProfilePhotoController,
  updateProfileBio as updateProfileBioController,
  updateProfileBackgroundPhoto as updateProfileBackgroundPhotoController,
  updateProfileBirthday as updateProfileBirthdayController,
  updateProfileGender as updateProfileGenderController,
  updateFirstAndLastName as updateFirstAndLastNameController,
  deleteProfilePhoto as deleteProfilePhotoController,
  deleteProfileBackgroundPhoto as deleteProfileBackgroundPhotoController,
  addEducationCollege as addEducationCollegeController,
  addEducationHighSchool as addEducationHighSchoolController,
  updateEducationCollege as updateEducationCollegeController,
  updateEducationHighSchool as updateEducationHighSchoolController,
  deleteEducationCollege as deleteEducationCollegeController,
  deleteEducationHighSchool as deleteEducationHighSchoolController,
  addCurrentCity as addCurrentCityController,
  updateCurrentCity as updateCurrentCityController,
  deleteCurrentCity as deleteCurrentCityController,
  addHometown as addHometownController,
  updateHometown as updateHometownController,
  deleteHometown as deleteHometownController,
  addPhoneNumber as addPhoneNumberController,
  updatePhoneNumber as updatePhoneNumberController,
  deletePhoneNumber as deletePhoneNumberController,
  sendFriendRequest as sendFriendRequestController,
  acceptFriendRequest as acceptFriendRequestController,
  cancelFriendRequest as cancelFriendRequestController,
  unfriend as unfriendController,
} from "../controllers/profile.js";

const router = express.Router();
const validGenders = ["male", "female"];
//update or add photo
router.patch("/updateProfilePhoto", isAuth, updateProfilePhotoController);
//update or add bio
router.patch("/updateProfileBio", isAuth, updateProfileBioController);
//update or add background photo
router.patch(
  "/updateProfileBackgroundPhoto",
  isAuth,
  updateProfileBackgroundPhotoController
);
//update birthday
router.put(
  "/updateProfileBirthday",
  isAuth,
  body("birthday", "Invalid date format for birthday")
    .isDate()
    .custom((value, { req }) => {
      const birthday = new Date(value);
      const currentDate = new Date();

      // Calculate age
      const age = Math.floor(
        (currentDate - birthday) / (365.25 * 24 * 60 * 60 * 1000)
      );

      // Check if age is 8 or older
      if (age < 8) {
        throw "Must be at least 8 years old";
      }
      return true;
    }),
  updateProfileBirthdayController
);
//update gender
router.put(
  "/updateProfileGender",
  isAuth,
  body(
    "gender",
    `Gender is required,Valid options are: ${validGenders.join(", ")}`
  )
    .notEmpty()
    .isIn(validGenders),
  updateProfileGenderController
);
//update first last name
router.put(
  "/updatePofileFirstAndLastName",
  isAuth,
  [
    body(
      "newFirstName",
      "First name must be at least 3 characters long and no number"
    )
      .trim()
      .isAlpha()
      .isLength({ min: 3 }),
    body(
      "newLastName",
      "Last name must be at least 3 characters long and no number"
    )
      .trim()
      .isAlpha()
      .isLength({ min: 3 }),
  ],
  updateFirstAndLastNameController
);
//delete profile photo
router.delete("/deleteProfilePhoto", isAuth, deleteProfilePhotoController);
//delete background photo
router.delete(
  "/deleteBackgroundPhoto",
  isAuth,
  deleteProfileBackgroundPhotoController
);

//add college
router.post(
  "/addEducationCollege",
  isAuth,
  [
    body("nameofCollege", "Name of college is Empty ").notEmpty(),
    body("graduated", "graduated should be boolean").isBoolean(),
  ],
  addEducationCollegeController
);
//add highschool
router.post(
  "/addEducationHighSchool",
  isAuth,
  [
    body("nameofHighSchool", "Name of high school is Empty ").notEmpty(),
    body(
      "year",
      "Year must be a valid integer between 1900 and the current year"
    ).isInt({ min: 1900, max: new Date().getFullYear() }),
  ],
  addEducationHighSchoolController
);
//update college
router.put(
  "/updateEducationCollege",
  isAuth,
  [
    body("nameofCollege", "Name of college is Empty ").notEmpty(),
    body("graduated", "graduated should be boolean").isBoolean(),
  ],
  updateEducationCollegeController
);
//update highschool
router.put(
  "/updateEducationHighSchool",
  isAuth,
  [
    body("nameofHighSchool", "Name of high school is Empty ").notEmpty(),
    body(
      "year",
      "Year must be a valid integer between 1900 and the current year"
    ).isInt({ min: 1900, max: new Date().getFullYear() }),
  ],
  updateEducationHighSchoolController
);
//delete college
router.delete(
  "/deleteEducationCollege",
  isAuth,
  deleteEducationCollegeController
);
//delete highschool
router.delete(
  "/deleteEducationHighSchool",
  isAuth,
  deleteEducationHighSchoolController
);
//add city
router.post(
  "/addCurrentCity",
  isAuth,
  body("name", "Invalid name").isAlpha(),
  addCurrentCityController
);
//add homwtown
router.post(
  "/addHometown",
  isAuth,
  body("name", "Invalid name").isAlpha(),
  addHometownController
);
//update city
router.put(
  "/updateCurrentCity",
  isAuth,
  body("name", "Invalid name").isAlpha(),
  updateCurrentCityController
);
//update hometown
router.put(
  "/updateHometown",
  isAuth,
  body("name", "Invalid name").isAlpha(),
  updateHometownController
);
//delete city
router.delete("/deleteCurrentCity", isAuth, deleteCurrentCityController);
//delete hometown
router.delete("/deleteHometown", isAuth, deleteHometownController);
//add phone number
router.post(
  "/addPhoneNumber",
  isAuth,
  body("phoneNumber")
    .matches(/^9639[3-689]\d{7}$/)
    .withMessage(
      "Invalid phone number. Must start with 9639 and have a valid fifth digit."
    )
    .isLength({ min: 12, max: 12 })
    .withMessage("Phone number must be 12 digits long."),
  addPhoneNumberController
);
//update phone number
router.put(
  "/updatePhoneNumber",
  isAuth,
  body("phoneNumber")
    .matches(/^9639[3-45689]\d{7}$/)
    .withMessage(
      "Invalid phone number. Must start with 9639 and have a valid fifth digit."
    )
    .isLength({ min: 12, max: 12 })
    .withMessage("Phone number must be 12 digits long."),
  updatePhoneNumberController
);
//delete phone number
router.delete("/deletePhoneNumber", isAuth, deletePhoneNumberController);

//send friend request
router.post("/sendFriendRequest", isAuth, sendFriendRequestController);
//accept friend request
router.post("/acceptFriendRequest", isAuth, acceptFriendRequestController);
//cancel friend request
router.post("/cancelFriendRequest", isAuth, cancelFriendRequestController);
//unfriend
router.post("/unfriend", isAuth, unfriendController);
export default router;

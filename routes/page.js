import express from "express";
import { body, param, query } from "express-validator";
import { isAuth } from "../middleware/is-Auth.js";
import { canSeeWithRole, isOwner } from "../middleware/for-Page.js";
import {
  createPage as createPageController,
  addCover as addCoverController,
  updateCover as updateCoverController,
  addLogo as addLogoController,
  updateLogo as updateLogoController,
  addBio as addBioController,
  updateBio as updateBioController,
  updateCategories as updateCategoriesController,
  addEducation_College as addEducation_CollegeController,
  updateEducation_College as updateEducation_CollegeController,
  deleteEducation_College as deleteEducation_CollegeController,
  addEducation_HighSchool as addEducation_HighSchoolController,
  updateEducation_HighSchool as updateEducation_HighSchoolController,
  deleteEducation_HighSchool as deleteEducation_HighSchoolController,
  addCurrentCity as addCurrentCityContrller,
  updateCurrentCity as updateCurrentCityController,
  deleteCurrentCity as deleteCurrentCityController,
  addHometown as addHometownController,
  updateHometown as updateHometownController,
  deleteHometown as deleteHometownController,
  addPhoneNumber as addPhoneNumberController,
  updatePhoneNumber as updatePhoneNumberController,
  deletePhoneNumber as deletePhoneNumberController,
  addEmail as addEmailController,
  updateEmail as updateEmailController,
  deleteEmail as deleteEmailController,
  blockUser as blockUserController,
  unblockUser as unblockUserController,
  deletePage as deletePageController,
  inviteFriendToLikeInPage as inviteFriendToLikeInPageController,
  acceptingInvitationToPage as acceptingInvitationToPageController,
  cancelingInvitationToPage as cancelingInvitationToPageController,
  likeInPage as likeInPageController,
  unlikeInPage as unlikeInPageController,
  ratePage as ratePageController,
  updateRate as updateRateController,
  deleteRate as deleteRateController,
  getMainInformations as getMainInformationsController,
  getFollowers as getFollowersController,
  getModerator as getModeratorController,
  getUsersBlocked as getUsersBlockedController ,
  getPosts as getPostsController,
  getYourFriendsWhoDidNotLike as getYourFriendsWhoDidNotLikeController,
  getRates as getRatesController
} from "../controllers/page.js";
import { pageCategories } from "../util/helpers.js";

const router = express.Router();

//create page
router.post(
  "/createPage",
  isAuth,
  [
    body("name", "Name must be at least 4 characters long").isLength({
      min: 4,
    }),
    body("categories")
      .isArray({ min: 1, max: 3 })
      .withMessage(
        "Values must be an array with  length must be between 1 and 3"
      )
      .custom((categories, { req }) => {
        return categories.every((category) =>
          pageCategories.includes(category)
        );
      })
      .withMessage("One or more categories not found in the categories allowd")
      .custom((categories, { req }) => {
        return new Set(categories).size === categories.length;
      })
      .withMessage("Array must not contain repeated values"),
  ],
  createPageController
);

//add cover
router.post("/addCover", isAuth, isOwner, addCoverController);
//update cover
router.post("/updateCover", isAuth, isOwner, updateCoverController);
//add logo
router.post("/addLogo", isAuth, isOwner, addLogoController);
//update logo
router.post("/updateLogo", isAuth, isOwner, updateLogoController);
//add bio
router.post("/addBio", isAuth, isOwner, addBioController);
//update bio
router.post("/updateBio", isAuth, isOwner, updateBioController);
//update categories
router.post(
  "/updateCategories",
  isAuth,
  isOwner,
  body("categories")
    .isArray({ min: 1, max: 3 })
    .withMessage("Values must be an array and length must be between 1 and 3")
    .custom((categories, { req }) => {
      return categories.every((category) => pageCategories.includes(category));
    })
    .withMessage("One or more categories not found in the categories allowd")
    .custom((categories, { req }) => {
      return new Set(categories).size === categories.length;
    })
    .withMessage("Array must not contain repeated values"),
  updateCategoriesController
);
//add college
router.post(
  "/addEducationCollege",
  isAuth,
  isOwner,
  [
    body("collegeName", "Name of college is Empty ").notEmpty(),
    body("graduated", "graduated should be boolean").isBoolean(),
  ],
  addEducation_CollegeController
);

//update college
router.post(
  "/updateEducationCollege",
  isAuth,
  isOwner,
  [
    body("collegeName", "Name of college is Empty ").notEmpty(),
    body("graduated", "graduated should be boolean").isBoolean(),
  ],
  updateEducation_CollegeController
);

//delete college
router.delete(
  "/deleteEducationCollege",
  isAuth,
  isOwner,
  deleteEducation_CollegeController
);
//add high school
router.post(
  "/addEducationHighSchool",
  isAuth,
  isOwner,
  [
    body("highSchoolName", "Name of high school is Empty ").notEmpty(),
    body(
      "year",
      "Year must be a valid integer between 1900 and the current year"
    ).isInt({ min: 1900, max: new Date().getFullYear() }),
  ],
  addEducation_HighSchoolController
);

//update high school
router.post(
  "/updateEducationHighSchool",
  isAuth,
  isOwner,
  [
    body("highSchoolName", "Name of high school is Empty ").notEmpty(),
    body(
      "year",
      "Year must be a valid integer between 1900 and the current year"
    ).isInt({ min: 1900, max: new Date().getFullYear() }),
  ],
  updateEducation_HighSchoolController
);

//delete high school
router.delete(
  "/deleteEducationHighSchool",
  isAuth,
  isOwner,
  deleteEducation_HighSchoolController
);
//add current city
router.post(
  "/addCurrentCity",
  isAuth,
  isOwner,
  body("name", "Invalid name").isAlpha(),
  addCurrentCityContrller
);

//update current city
router.post(
  "/updateCurrentCity",
  isAuth,
  isOwner,
  body("name", "Invalid name").isAlpha(),
  updateCurrentCityController
);
//delete current city
router.delete(
  "/deleteCurrentCity",
  isAuth,
  isOwner,
  deleteCurrentCityController
);

//add homwtown
router.post(
  "/addHometown",
  isAuth,
  body("name", "Invalid name").isAlpha(),
  addHometownController
);
//update hometown
router.post(
  "/updateHometown",
  isAuth,
  body("name", "Invalid name").isAlpha(),
  updateHometownController
);

//delete hometown
router.delete("/deleteHometown", isAuth, deleteHometownController);

//add phone number
router.post(
  "/addPhoneNumber",
  isAuth,
  isOwner,
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
router.post(
  "/updatePhoneNumber",
  isAuth,
  isOwner,
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
router.delete(
  "/deletePhoneNumber",
  isAuth,
  isOwner,
  deletePhoneNumberController
);
//add email
router.post(
  "/addEmail",
  isAuth,
  isOwner,
  body("email").isEmail().withMessage("Invalid email syntex"),
  addEmailController
);
//update email
router.post(
  "/updateEmail",
  isAuth,
  isOwner,
  body("email").isEmail().withMessage("Invalid email syntex"),
  updateEmailController
);
//delete email
router.delete("/deleteEmail", isAuth, isOwner, deleteEmailController);

//block user
router.post("/blockUser", isAuth, isOwner, blockUserController);
router.post("/unblockUser", isAuth, isOwner, unblockUserController);
router.delete("/deletePage", isAuth, isOwner, deletePageController);

router.post(
  "/inviteFriend",
  isAuth,
  [body("friendId").isMongoId(), body("pageId").isMongoId()],
  inviteFriendToLikeInPageController
);

router.post(
  "/acceptInvite",
  isAuth,
  body("_InvitationId").isMongoId(),
  acceptingInvitationToPageController
);
router.post(
  "/cancelInvite",
  isAuth,
  body("_InvitationId").isMongoId(),
  cancelingInvitationToPageController
);

router.post(
  "/likeInPage",
  isAuth,
  body("pageId").isMongoId(),
  likeInPageController
);
router.post(
  "/unlikeInPage",
  isAuth,
  body("pageId").isMongoId(),
  unlikeInPageController
);

router.post(
  "/ratePage",
  isAuth,
  [
    body("comment").notEmpty().withMessage("Comment should be not empty"),
    body("value")
      .isIn([1, 2, 3, 4, 5])
      .withMessage("value should be 1 2 3 4 or 5 "),
    body("pageId").isMongoId().withMessage("Invalid Id"),
  ],
  ratePageController
);
router.post(
  "/updateRate",
  isAuth,
  [
    body("comment").notEmpty().withMessage("Comment should be not empty"),
    body("value")
      .isIn([1, 2, 3, 4, 5])
      .withMessage("value should be 1 2 3 4 or 5 "),
    body("pageId").isMongoId().withMessage("Invalid Id"),
    body("_rateId").isMongoId().withMessage("Invalid Id"),
  ],
  updateRateController
);
router.post(
  "/deleteRate",
  isAuth,
  [
    body("pageId").isMongoId().withMessage("Invalid Id"),
    body("_rateId").isMongoId().withMessage("Invalid Id"),
  ],
  deleteRateController
);

////////

router.get(
  "/MainInfo/:pageId",
  isAuth,
  [
    param("pageId").isMongoId().withMessage("Invalid ID"),
    // query("page").isInt().withMessage("Page should be number"),
  ],
  canSeeWithRole,
  getMainInformationsController
);
router.get(
  "/Followers/:pageId",
  isAuth,
  [
    param("pageId").isMongoId().withMessage("Invalid ID"),
    query("page").isInt().withMessage("Page should be number"),
  ],
  canSeeWithRole,
  getFollowersController
);
router.get(
  "/moderator/:pageId",
  isAuth,
  [param("pageId").isMongoId().withMessage("Invalid ID")],
  canSeeWithRole,
  getModeratorController
);
router.get(
  "/usersBlocked/:pageId",
  isAuth,
  [param("pageId").isMongoId().withMessage("Invalid ID")],
  canSeeWithRole,
  getUsersBlockedController
);
router.get(
  "/posts/:pageId",
  isAuth,
  [
    param("pageId").isMongoId().withMessage("Invalid ID"),
    query("page").isInt().withMessage("Page should be number"),
  ],
  canSeeWithRole,
  getPostsController
);
router.get(
  "/friendsWhoDidNotLike/:pageId",
  isAuth,
  [
    param("pageId").isMongoId().withMessage("Invalid ID"),
    query("page").isInt().withMessage("Page should be number"),
  ],
  canSeeWithRole,
  getYourFriendsWhoDidNotLikeController
);
router.get(
  "/rates/:pageId",
  isAuth,
  [
    param("pageId").isMongoId().withMessage("Invalid ID"),
    query("page").isInt().withMessage("Page should be number"),
  ],
  canSeeWithRole,
  getRatesController
);

export default router;

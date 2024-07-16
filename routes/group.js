import express from "express";
import { body, param, query } from "express-validator";
import {
  canSee,
  didJoinGroup,
  isAdmin,
  isMember,
  isModerator,
} from "../middleware/for-group.js";

import { isAuth } from "../middleware/is-Auth.js";
import {
  createGroup as createGroupController,
  addCoverPhoto as addCoverPhotoController,
  updateCoverPhoto as updateCoverPhotoController,
  addDescription as addDescriptionController,
  updateDescription as updateDescriptionController,
  updateName as updateNameController,
  changeVisibility as changeVisibilityController,
  changePrivacy as changePrivacyController,
  changeWhoCanPost as changeWhoCanPostController,
  changeImmediatePost as changeImmediatePostController,
  changeWhoCanApproveMemberRequest as changeWhoCanApproveMemberRequestController,
  addAdmin as addAdminController,
  inviteUser as inviteUserController,
  AcceptRequestJoin as AcceptRequestJoinController,
  rejectRequestJoin as rejectRequestJoinController,
  acceptRequestPost as acceptRequestPostController,
  rejectRequestPost as rejectRequestPostController,
  reportPost as reportPostController,
  deleteReportPost as deleteReportPostController,
  deleteReportPostFromAdmin as deleteReportPostFromAdminController,
  blockMemberOrAdmin as blockMemberOrAdminController,
  unblockMember as unblockMemberController,
  leaveGroup as leaveGroupController,
  fromAdminToMember as fromAdminToMemberController,
  deleteGroup as deleteGroupController,
  getMainInformations as getMainInformationsController,
  getMembers as getMembersController,
  getAdmins as getAdminsController,
  getModerator as getModeratorController,
  getPosts as getPostsController,
  getRequestPosts as getRequestPostsController,
  getJoiningRequests as getJoiningRequestsController,
  getYourRequestPosts as getYourRequestPostsController,
  getReports as getReportsController,
  getReportsFromAdmin as getReportsFromAdminController,
  getMembersBlocked as getMembersBlockedController,
  getYourFriendsWhoDidNotJoin as getYourFriendsWhoDidNotJoinController,
} from "../controllers/group.js";
import {
  WhoCanPostorApproveMemberRequest,
  privacy,
  visibility,
} from "../util/configGroup.js";

const router = express.Router();

//create group
router.post(
  "/createGroup",
  isAuth,
  [
    body("name", "Name should be not empty").notEmpty(),
    body("privacy", "Privacy should be public or private").isIn([
      privacy.PUBLIC,
      privacy.PRIVATE,
    ]),
    body("visibility")
      .isIn([visibility.HIDDEN, visibility.VISIBLE])
      .withMessage("Visibility should be visible or hidden ")
      .custom((value, { req }) => {
        if (
          req.body.privacy === privacy.PUBLIC &&
          value === visibility.HIDDEN
        ) {
          throw new Error("Can not set public and hidden together ");
        } else {
          return true;
        }
      }),
  ],
  createGroupController
);

//add cover
router.post("/addCoverPhoto", isAuth, isAdmin, addCoverPhotoController);
//update cover
router.post("/updateCoverPhoto", isAuth, isAdmin, updateCoverPhotoController);

//add description
router.post(
  "/addDescription",
  isAuth,
  isAdmin,
  body("description", "Description should not be empty ").notEmpty(),
  addDescriptionController
);
//update description
router.post(
  "/updateDescription",
  isAuth,
  isAdmin,
  body("description", "Description should not be empty ").notEmpty(),
  updateDescriptionController
);
//update name
router.post(
  "/updateName",
  isAuth,
  isModerator,
  body("name", "Name should be not empty").notEmpty(),
  updateNameController
);
//change visibility
router.post(
  "/changeVisibility",
  isAuth,
  isModerator,
  body("visibility")
    .isIn([visibility.HIDDEN, visibility.VISIBLE])
    .withMessage("Visibility should be visible or hidden "),
  changeVisibilityController
);
//change privacy
router.post(
  "/changePrivacy",
  isAuth,
  isModerator,
  body("privacy")
    .isIn([privacy.PRIVATE, privacy.PUBLIC])
    .withMessage("privacy should be public or private "),
  changePrivacyController
);
//change who can post
router.post(
  "/changeWhoCanPost",
  isAuth,
  isAdmin,
  body(
    "whoCanPost",
    "Who can post should be anyone or adminsAndModerator "
  ).isIn([
    WhoCanPostorApproveMemberRequest.ADMINS_AND_MODERATOR,
    WhoCanPostorApproveMemberRequest.ANY_ONE_IN_GROUP,
  ]),
  changeWhoCanPostController
);
//change immediate post
router.post(
  "/changeImmediatePost",
  isAuth,
  isAdmin,
  changeImmediatePostController
);

//change who can approve member request
router.post(
  "/changeWhoCanApproveMemberRequest",
  isAuth,
  isAdmin,
  body(
    "whoCanApproveMemberRequest",
    "Who can approve member request should be anyone or adminsAndModerator "
  ).isIn([
    WhoCanPostorApproveMemberRequest.ADMINS_AND_MODERATOR,
    WhoCanPostorApproveMemberRequest.ANY_ONE_IN_GROUP,
  ]),
  changeWhoCanApproveMemberRequestController
);

//add admin
router.post("/addAdmin", isAuth, isModerator, addAdminController);

router.post("/inviteUser", isAuth, isMember, inviteUserController);
router.post(
  "/AcceptRequestJoin",
  isAuth,
  isMember,
  AcceptRequestJoinController
);
router.post(
  "/rejectRequestJoin",
  isAuth,
  isMember,
  rejectRequestJoinController
);
router.post("/acceptRequestPost", isAuth, isAdmin, acceptRequestPostController);
router.post("/rejectRequestPost", isAuth, isAdmin, rejectRequestPostController);
router.post("/reportPost", isAuth, isMember, reportPostController);
router.delete("/deleteReportPost", isAuth, isAdmin, deleteReportPostController);
router.delete(
  "/deleteReportPostFromAdmin",
  isAuth,
  isModerator,
  deleteReportPostFromAdminController
);

router.post(
  "/blockMemberOrAdmin",
  isAuth,
  isAdmin,
  blockMemberOrAdminController
);
router.post("/unblockMember", isAuth, isAdmin, unblockMemberController);
router.post(
  "/fromAdminToMember",
  isAuth,
  isModerator,
  fromAdminToMemberController
);

router.post("/leaveGroup", isAuth, isMember, leaveGroupController);
router.delete("/deleteGroup", isAuth, isModerator, deleteGroupController);

//get operations

router.get(
  "/mainInformations/:groupId",
  isAuth,
  param("groupId").isMongoId().withMessage("Invalid ID"),
  didJoinGroup,
  canSee,
  getMainInformationsController
);

router.get(
  "/members/:groupId",
  isAuth,
  [
    param("groupId").isMongoId().withMessage("Invalid ID"),
    query("page").isInt().withMessage("Page should be number"),
  ],
  didJoinGroup,
  canSee,
  getMembersController
);
router.get(
  "/admins/:groupId",
  isAuth,
  [
    param("groupId").isMongoId().withMessage("Invalid ID"),
    query("page").isInt().withMessage("Page should be number"),
  ],
  didJoinGroup,
  canSee,
  getAdminsController
);
router.get(
  "/moderator/:groupId",
  isAuth,
  [param("groupId").isMongoId().withMessage("Invalid ID")],
  didJoinGroup,
  canSee,
  getModeratorController
);
router.get(
  "/posts/:groupId",
  isAuth,
  [
    param("groupId").isMongoId().withMessage("Invalid ID"),
    query("page").isInt().withMessage("Page should be number"),
  ],
  didJoinGroup,
  canSee,
  getPostsController
);
router.get(
  "/requestPosts/:groupId",
  isAuth,
  [
    param("groupId").isMongoId().withMessage("Invalid ID"),
    query("page").isInt().withMessage("Page should be number"),
  ],
  didJoinGroup,
  canSee,
  getRequestPostsController
);
router.get(
  "/yourRequestPosts/:groupId",
  isAuth,
  [
    param("groupId").isMongoId().withMessage("Invalid ID"),
    query("page").isInt().withMessage("Page should be number"),
  ],
  didJoinGroup,
  canSee,
  getYourRequestPostsController
);
router.get(
  "/joiningRequests/:groupId",
  isAuth,
  [
    param("groupId").isMongoId().withMessage("Invalid ID"),
    query("page").isInt().withMessage("Page should be number"),
  ],
  didJoinGroup,
  canSee,
  getJoiningRequestsController
);
router.get(
  "/reports/:groupId",
  isAuth,
  [
    param("groupId").isMongoId().withMessage("Invalid ID"),
    query("page").isInt().withMessage("Page should be number"),
  ],
  didJoinGroup,
  canSee,
  getReportsController
);
router.get(
  "/reportsFromAdmin/:groupId",
  isAuth,
  [
    param("groupId").isMongoId().withMessage("Invalid ID"),
    query("page").isInt().withMessage("Page should be number"),
  ],
  didJoinGroup,
  canSee,
  getReportsFromAdminController
);
router.get(
  "/membersBlocked/:groupId",
  isAuth,
  [
    param("groupId").isMongoId().withMessage("Invalid ID"),
    query("page").isInt().withMessage("Page should be number"),
  ],
  didJoinGroup,
  canSee,
  getMembersBlockedController
);
router.get(
  "/friendsDidNotJoin/:groupId",
  isAuth,
  [
    param("groupId").isMongoId().withMessage("Invalid ID"),
    query("page").isInt().withMessage("Page should be number"),
  ],
  didJoinGroup,
  canSee,
  getYourFriendsWhoDidNotJoinController
);

export default router;

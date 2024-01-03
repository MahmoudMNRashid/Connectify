import express from "express";
import { body } from "express-validator";
import { isAdmin, isAuth, isMember, isModerator } from "../middleware/is-Auth.js";
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
  changeWhoCanApproveMemberRequest as changeWhoCanApproveMemberRequestController,
  addAdmin as addAdminController,
  createPost as createPostController,
  updatePost as updatePostController,
  deletePost as deletePostController,
  sendRequestJoin as sendRequestJoinContrller,
  inviteUser as inviteUserController,
  cancelInvite as cancelInviteContorller
} from "../controllers/group.js";

const privacy = ["public", "private"];
const visibility = ["visible", "hidden"];
const whoCanPost = ["anyone", "adminsAndModerator"]; // anyone means member(should be join to group)
const whoCanApproveMemberRequest = ["anyone", "adminsAndModerator"]; // anyone means member(should be join to group)

const router = express.Router();

//create group
router.post(
  "/createGroup",
  isAuth,
  [
    body("name", "Name should be not empty").notEmpty(),
    body("privacy", "Privacy should be public or private").isIn(privacy),
    body("visibility")
      .isIn(visibility)
      .withMessage("Visibility should be visible or hidden ")
      .custom((value, { req }) => {
        if (req.body.privacy === "public" && value === "hidden") {
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
    .isIn(visibility)
    .withMessage("Visibility should be visible or hidden "),
  changeVisibilityController
);

//change privacy
router.post(
  "/changePrivacy",
  isAuth,
  isModerator,
  body("privacy")
    .isIn(privacy)
    .withMessage("privacy should be public or private "),
  changePrivacyController
);

//change who can post
router.post(
  "/changeWhoCanPost",
  isAuth,
  isModerator,
  body(
    "whoCanPost",
    "Who can post should be anyone or adminsAndModerator "
  ).isIn(whoCanPost),
  changeWhoCanPostController
);

//change who can approve member request
router.post(
  "/changeWhoCanApproveMemberRequest",
  isAuth,
  isModerator,
  body(
    "whoCanApproveMemberRequest",
    "Who can approve member request should be anyone or adminsAndModerator "
  ).isIn(whoCanApproveMemberRequest),
  changeWhoCanApproveMemberRequestController
);

//add admin
router.post('/addAdmin',isAuth,isModerator,addAdminController)

router.post('/createPost',isAuth,isMember,createPostController)

router.patch('/updatePost',isAuth,isMember,updatePostController)
router.delete('/deletePost',isAuth,isMember,deletePostController)

router.post('/sendRequestJoin',isAuth,sendRequestJoinContrller)

router.delete('/cancelInvite',isAuth,cancelInviteContorller)
router.post('/inviteUser',isAuth,isMember,inviteUserController)
export default router;

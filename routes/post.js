import express from "express";
import { body } from "express-validator";
import {
  createPost as createPostController,
  updatePost as updatePostController,
  deletePost as deletePostController,
  likePost as likePostController,
  unlikePost as unlikePostController,
  createComment as createCommentController,
  updateComment as updateCommentController,
  deleteComment as deleteCommentController,
  getComments as getCommentsController,
  getLikes as getLikesController,
  searchInPosts as searchInPostsController,
} from "../controllers/post.js";
import { canSee, didJoinGroup, isMember } from "../middleware/for-group.js";
import { isAuth } from "../middleware/is-Auth.js";
import {
  canSeeWithRole as canSeeWithRolePage,
  isOwner,
} from "../middleware/for-Page.js";

import { canSeeWithRole as canSeeWithRoleProfile } from "../middleware/for-Profile.js";


import { whoCanComment_Page, whoCanSee_Page } from "../util/configPage.js";
import {
  whoCanComment_Profile,
  whoCanSee_Profile,
} from "../util/configProfile.js";
const router = express.Router();

//create post
router.post("/profile/createpost", isAuth, [
  body("whoCanComment")
    .isIn([whoCanComment_Profile.FRIENDS, whoCanComment_Profile.PUBLIC])
    .withMessage("Who can comment should be :friends or public"),
  body("whoCanSee")
    .isIn([whoCanSee_Profile.FRIENDS, whoCanSee_Profile.PUBLIC])
    .withMessage("Who can see should be :friends or public"),
  createPostController,
]);

router.post(
  "/page/createpost",
  isAuth,
  isOwner,
  [
    body("whoCanComment")
      .isIn([whoCanComment_Page.FOLLOWERS, whoCanComment_Page.PUBLIC])
      .withMessage("Who can comment should be :public or followers"),
    body("whoCanSee")
      .isIn([whoCanSee_Page.FOLLOWERS, whoCanSee_Page.PUBLIC])
      .withMessage("Who can see should be :public or followers"),
  ],
  createPostController
);

router.post("/group/createPost", isAuth, isMember, createPostController);

//update post
router.post("/profile/updatePost", isAuth, [
  body("whoCanComment")
    .isIn([whoCanComment_Profile.FRIENDS, whoCanComment_Profile.PUBLIC])
    .withMessage("Who can comment should be :friends or public"),
  body("whoCanSee")
    .isIn([whoCanSee_Profile.FRIENDS, whoCanSee_Profile.PUBLIC])
    .withMessage("Who can see should be :friends or public"),
  body("postId").isMongoId().withMessage("Invalid ID"),

  updatePostController,
]);

router.post(
  "/page/updatePost",
  isAuth,
  [
    body("whoCanComment")
      .isIn([whoCanComment_Page.FOLLOWERS, whoCanComment_Page.PUBLIC])
      .withMessage("Who can comment should be :public or followers"),
    body("whoCanSee")
      .isIn([whoCanSee_Page.FOLLOWERS, whoCanSee_Page.PUBLIC])
      .withMessage("Who can see should be :public or followers"),
    body("postId").isMongoId().withMessage("Invalid ID"),
  ],
  isOwner,
  updatePostController
);

router.post(
  "/group/updatePost",
  isAuth,
  body("postId").isMongoId().withMessage("Invalid ID"),
  isMember,
  updatePostController
);
//delete post
router.delete(
  "/profile/deletePost",
  isAuth,
  body("postId").isMongoId().withMessage("Invalid ID"),
  deletePostController
);

router.delete(
  "/page/deletePost",
  isAuth,

  [body("postId").isMongoId().withMessage("Invalid ID")],
  isOwner,
  deletePostController
);

router.delete(
  "/group/deletePost",
  isAuth,
  body("postId").isMongoId().withMessage("Invalid ID"),
  isMember,
  deletePostController
);

//like post
router.post(
  "/profile/likePost",
  isAuth,
  canSeeWithRoleProfile,
  body("postId").isMongoId().withMessage("Invalid ID"),
  likePostController
);
router.post(
  "/page/likePost",
  isAuth,
  body("postId").isMongoId().withMessage("Invalid ID"),
  canSeeWithRolePage,
  likePostController
);
router.post(
  "/group/likePost",
  isAuth,
  body("postId").isMongoId().withMessage("Invalid ID"),
  isMember,
  likePostController
);

//unlike post
router.post(
  "/profile/unlikePost",
  isAuth,
  body("postId").isMongoId().withMessage("Invalid ID"),
  canSeeWithRoleProfile,
  unlikePostController
);
router.post(
  "/page/unlikePost",
  isAuth,
  body("postId").isMongoId().withMessage("Invalid ID"),
  canSeeWithRolePage,
  unlikePostController
);
router.post(
  "/group/unlikePost",
  isAuth,
  body("postId").isMongoId().withMessage("Invalid ID"),
  isMember,
  unlikePostController
);

//comment post
router.post(
  "/profile/createComment",
  isAuth,
  body("postId").isMongoId().withMessage("Invalid ID"),
  canSeeWithRoleProfile,
  createCommentController
);
router.post(
  "/page/createComment",
  isAuth,
  body("postId").isMongoId().withMessage("Invalid ID"),
  canSeeWithRolePage,
  createCommentController
);
router.post(
  "/group/createComment",
  isAuth,
  body("postId").isMongoId().withMessage("Invalid ID"),
  isMember,
  createCommentController
);
//update comment
router.post(
  "/profile/updateComment",
  isAuth,
  body("postId").isMongoId().withMessage("Invalid ID"),
  body("_commentId").isMongoId().withMessage("Invalid ID"),
  canSeeWithRoleProfile,
  updateCommentController
);
router.post(
  "/page/updateComment",
  isAuth,
  body("postId").isMongoId().withMessage("Invalid ID"),
  body("_commentId").isMongoId().withMessage("Invalid ID"),
  canSeeWithRolePage,
  updateCommentController
);
router.post(
  "/group/updateComment",
  isAuth,
  body("postId").isMongoId().withMessage("Invalid ID"),
  body("_commentId").isMongoId().withMessage("Invalid ID"),
  isMember,
  updateCommentController
);

//delete comment
router.delete(
  "/profile/deleteComment",
  isAuth,
  body("postId").isMongoId().withMessage("Invalid ID"),
  body("_commentId").isMongoId().withMessage("Invalid ID"),
  canSeeWithRoleProfile,
  deleteCommentController
);
router.delete(
  "/page/deleteComment",
  isAuth,
  body("postId").isMongoId().withMessage("Invalid ID"),
  body("_commentId").isMongoId().withMessage("Invalid ID"),
  canSeeWithRolePage,
  deleteCommentController
);
router.delete(
  "/group/deleteComment",
  isAuth,
  body("postId").isMongoId().withMessage("Invalid ID"),
  body("_commentId").isMongoId().withMessage("Invalid ID"),
  isMember,
  deleteCommentController
);
//get comments
router.get(
  "/profile/comments/:profileId/:postId",
  isAuth,
  canSeeWithRoleProfile,
  getCommentsController
);
router.get(
  "/page/comments/:pageId/:postId",
  isAuth,
  canSeeWithRolePage,
  getCommentsController
);
router.get(
  "/group/comments/:groupId/:postId",
  isAuth,
  didJoinGroup,
  canSee,
  getCommentsController
);
//get likes
router.get(
  "/profile/likes/:profileId/:postId",
  isAuth,
  canSeeWithRoleProfile,
  getLikesController
);

router.get(
  "/page/likes/:pageId/:postId",
  isAuth,
  canSeeWithRolePage,
  getLikesController
);
router.get(
  "/group/likes/:groupId/:postId",
  isAuth,
  didJoinGroup,
  canSee,
  getLikesController
);

router.get(
  "/profile/search/:profileId",
  isAuth,
  canSeeWithRoleProfile,
  searchInPostsController
);
router.get(
  "/page/search/:pageId",
  isAuth,
  canSeeWithRolePage,
  searchInPostsController
);
router.get(
  "/group/search/:groupId",
  isAuth,
  didJoinGroup,
  canSee,
  searchInPostsController
);
export default router;

import express from "express";
import { body } from "express-validator";
import {
  createPostFromProfile as createPostFromProfileController,
  updatePostFromProfile as updatePostFromProfileController,
  deletePostFromProfile as deletePostFromProfileController 
} from "../controllers/post.js";
import { isAuth } from "../middleware/is-Auth.js";
const router = express.Router();

//Create post for profile user
router.post("/createProfilePost", isAuth, createPostFromProfileController);
router.patch("/updateProfilePost", isAuth, updatePostFromProfileController);
router.delete("/deleteProfilePost",isAuth,deletePostFromProfileController)
export default router;

import express from "express";
import { body } from "express-validator";

import User from "../models/user.js";
import {
  signup as signupController,
  signin as signinController,
  confirm as confirmController,
  resetPassword as resetPasswordController,
  newPassword as newPasswordController,
  checkResetPassword as checkResetPasswordController,
} from "../controllers/auth.js";

const router = express.Router();

const validGenders = ["male", "female"];

router.put(
  "/signup",
  [
    body(
      "firstName",
      "Firstname must be at least 3 characters long and no number"
    )
      .trim()
      .isAlpha()
      .isLength({ min: 3 }),
    body(
      "lastName",
      "Lastname must be at least 3 characters long and no number"
    )
      .trim()
      .isAlpha()
      .isLength({ min: 3 }),
    body("email", "Email is invalid").isEmail().normalizeEmail(),
    body(
      "password",
      "Password must be at least 6 characters long,Password must contain at least one letter, one number, and one special character: @$!%*?&"
    )
      .trim()
      .isLength({ min: 6 })
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/
      ),
    body("birthDay", "Invalid date format for birthday")
      .notEmpty()
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
    body(
      "gender",
      `Gender is required,Valid options are: ${validGenders.join(", ")}`
    )
      .notEmpty()
      .isIn(validGenders),
    body("confirmPassword")
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw "Password Confirmation does not match password";
        }
        return true;
      }),
  ],
  signupController
);

router.post(
  "/login",
  [
    body("email", "Email is invalid").isEmail().normalizeEmail(),
    body(
      "password",
      "Password must be at least 6 characters long,Password must contain at least one letter, one number, and one special character: @$!%*?&"
    )
      .trim()
      .isLength({ min: 6 })
      .matches(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/),
  ],
  signinController
);

router.get("/confirm/:token", confirmController);

router.post(
  "/resetPassword",
  body("email", "Email is invalid").isEmail().normalizeEmail(),
  resetPasswordController
);

router.put(
  "/newPassword",
  [
    body(
      "newPassword",
      "Password must be at least 6 characters long,Password must contain at least one letter, one number, and one special character: @$!%*?&"
    )
      .trim()
      .isLength({ min: 6 })
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/
      ),
    body("userId").isMongoId().withMessage("Wrong Id"),
    body("token").notEmpty().withMessage("Token should not be empty"),
  ],
  newPasswordController
);

router.post(
  "/checkResetPassword",
  [
    body("userId").isMongoId().withMessage("Wrong Id"),
    body("token").notEmpty().withMessage("Token should not be empty"),
  ],
  checkResetPasswordController
);
export default router;

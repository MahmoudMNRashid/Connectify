import nodemailer from "nodemailer";
import { validationResult } from "express-validator";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/user.js";
import { privateKey, role } from "../util/auth.js";
import { port } from "../util/connect.js";
import mongoose from "mongoose";

const config = {
  service: process.env.CONFIG_EMAIL_SERVICE_SERVICE, // your email domain
  auth: {
    user: process.env.CONFIG_EMAIL_SERVICE_USER, // your email address
    pass: process.env.CONFIG_EMAIL_SERVICE_PASS, // your password
  },
};
const transporter = nodemailer.createTransport(config);

export const signup = async (req, res, next) => {
  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    const user = await User.findOne({ email: req.body.email });
    if (user) {
      const error = new Error("User already exists");
      error.statusCode = 409;
      throw error;
    }
    const confirmationToken = crypto.randomBytes(22).toString("hex");

    const hashedPassword = await bcrypt.hash(req.body.password, 12);

    const userDetails = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: hashedPassword,
      gender: req.body.gender,
      birthDay: req.body.birthDay,
      role: role[0],
      confirmationToken: confirmationToken,
    };

    const newUser = new User(userDetails);
    await newUser.save();

    const confirmationLink = `http://localhost:${port}/auth/confirm/${confirmationToken}`;
    const mailOptions = {
      from: process.env.CONFIG_EMAIL_FROM,
      to: userDetails.email,
      subject: "Confirm Your Email",
      text: `Click the following link to confirm your email: ${confirmationLink}`,
    };
    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      message:
        "Registered successfully,Please check your email for a confirmation link. ",
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
export const signin = async (req, res, next) => {
  const errors = validationResult(req);
  const email = req.body.email;
  const password = req.body.password;
  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error("Email not found");
      error.statusCode = 404;
      throw error;
    }

    if (user.confirm === false) {
      const error = new Error(
        "Please confirm your email after that you can login"
      );
      error.statusCode = 403;
      throw error;
    }

    const checkedPassword = await bcrypt.compare(password, user.password);

    if (!checkedPassword) {
      const error = new Error("Your password is wrong");
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign(
      { email: user.email, userId: user._id.toString(), role: user.role },
      process.env.PRIVATE_KEY,
      { expiresIn: "20000h" }
    );

    res
      .status(200)
      .json({ token, userId: user._id.toString(), role: user.role });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const confirm = async (req, res, next) => {
  const token = req.params.token;
  try {
    const user = await User.findOne({ confirmationToken: token });
    if (!user) {
      const error = new Error("Not auth,You Can not confirm your email");
      error.statusCode = 401;
      throw error;
    }

    user.confirmationToken = undefined;
    user.confirm = true;
    await user.save();
    return res.status(200).send("Email confirmed successfully!");
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  const errors = validationResult(req);
  const email = req.body.email;
  console.log(email);
  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const resetPasswordToken = crypto.randomBytes(22).toString("hex");
    const resetPasswordTokenExpire = Date.now() + 3600000;
    const confirmationLink = `http://localhost:${port}/auth/reset/${resetPasswordToken}?userId=${user._id.toString()}`;
    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordTokenExpire = resetPasswordTokenExpire;
    await user.save();
    const mailOptions = {
      from: "akai00917@gmail.com",
      to: user.email,
      subject: "reset your password,link is valid for one hour",
      text: `Click the following link to reset your password: ${confirmationLink}`,
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({
      message: "Please check your email for a Reset Password link. ",
    });
  } catch (error) {}
};
export const newPassword = async (req, res, next) => {
  const errors = validationResult(req);
  const token = req.body.token;
  const userId = req.body.userId;
  const newPassword = req.body.newPassword;
  console.log(token, userId, newPassword);
  try {
    if (!errors.isEmpty()) {
      const error = new Error("Validation failed");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    const user = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
      resetPasswordToken: token,
      resetPasswordTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      const error = new Error("User not found or Expire Date ended");
      error.statusCode = 401;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpire = undefined;
    await user.save();
    res.status(200).json({ message: "Password reset Successfully " });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

import nodemailer from "nodemailer";
import { validationResult } from "express-validator";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/user.js";
import { role } from "../util/auth.js";
import { hostOnline } from "../util/connect.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { createError } from "../util/helpers.js";
dotenv.config();

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

    const confirmationLink = `${hostOnline}/auth/confirm/${confirmationToken}`;
    const mailOptions = {
      from: `"${process.env.CONFIG_EMAIL_FROM}" <${process.env.CONFIG_EMAIL_SERVICE_USER}>`,
      to: userDetails.email,
      subject: "Confirm Your Email",
      text: `Click the following link to confirm your email: ${confirmationLink}`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Confirmation</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              text-align: center;
              padding: 20px;
            }
    
            p {
              color: #555;
            }
    
            a {
              color: #3498db;
              text-decoration: none;
            }
    
            a:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <p>Click the following link to confirm your email:</p>
          <a href="${confirmationLink}">${confirmationLink}</a>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);

    const newUser = new User(userDetails);
    await newUser.save();

    res.status(200).json({
      message:
        "Registered successfully,Please check your email for a confirmation link.  i will put link here for test and speedup ",
      link: confirmationLink,
    });
  } catch (error) {
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
    const user = await User.findOne(
      { email: email },
      { confirm: 1, password: 1, role: 1 }
    );
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
      { expiresIn: "30d" }
    );

    res.status(200).json({
      token,
      userId: user._id.toString(),
      role: user.role,
      experation: 24 * 60 * 60 * 1000 * 30,
    });
  } catch (error) {
    next(error);
  }
};

export const confirm = async (req, res, next) => {
  const token = req.params.token;
  try {
    const user = await User.findOne(
      { confirmationToken: token },
      { confirm: 1, confirmationToken: 1 }
    );
    if (!user) {
      res.status(401).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Confirmation</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              text-align: center;
              padding: 20px;
            }
    
            p {
              color: #555;
            }
    
            a {
              color: #3498db;
              text-decoration: none;
            }
    
            a:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <p>Not Authorization  401!</p>
          
        </body>
        </html>
      `);
    }

    user.confirmationToken = undefined;
    user.confirm = true;
    await user.save();
    return res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Confirmation</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          text-align: center;
          padding: 20px;
        }
  
        h1 {
          color: #3498db;
        }
  
        p {
          color: #555;
        }
      </style>
    </head>
    <body>
      <h1>Email confirmed successfully!</h1>
      <p>Your email has been successfully confirmed. Thank you for your registration.</p>
    </body>
    </html>
  `);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  const errors = validationResult(req);
  const email = req.body.email;
  try {
    if (!errors.isEmpty()) {
      createError(422, "Validation failed");
    }

    const user = await User.findOne(
      { email: email },
      { email: 1, resetPasswordToken: 1, resetPasswordTokenExpire: 1 }
    );
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const resetPasswordToken = crypto.randomBytes(22).toString("hex");
    const resetPasswordTokenExpire = Date.now() + 3600000;
    const confirmationLink = `http://localhost:5173/auth/reset-password/${resetPasswordToken}?userId=${user._id.toString()}`;
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
  } catch (error) {
    next(error);
  }
};
export const newPassword = async (req, res, next) => {
 //a
  const errors = validationResult(req);
  const token = req.body.token;
  const userId = req.body.userId;
  const newPassword = req.body.newPassword;
  try {
    if (!errors.isEmpty()) {
      createError(422, "Validation failed", errors.array());
    }

    const user = await User.findOne(
      {
        _id: new mongoose.Types.ObjectId(userId),
        resetPasswordToken: token,
        resetPasswordTokenExpire: { $gt: Date.now() },
      },
      {
        password: 1,
        resetPasswordToken: 1,
        resetPasswordTokenExpire: 1,
      }
    );

    if (!user) {
      createError(403, "Forbidden");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpire = undefined;
    await user.save();
    res.status(200).json({ message: "Password reset Successfully " });
  } catch (error) {
    next(error);
  }
};

export const checkResetPassword = async (req, res, next) => {
  const errors = validationResult(req);
  const token = req.body.token;
  const userId = req.body.userId;

  try {
    if (!errors.isEmpty()) {
      createError(422, "Validation failed");
    }

    const user = await User.findOne(
      {
        _id: new mongoose.Types.ObjectId(userId),
        resetPasswordToken: token,
        resetPasswordTokenExpire: { $gt: Date.now() },
      },
      {
        _id: 1,
      }
    );

    if (!user) {
      createError(403, "Forbidden");
    }

    res.status(200).json({ message: "success" });
  } catch (error) {
    next(error);
  }
};

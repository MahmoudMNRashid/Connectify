import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { createError } from "../util/helpers.js";

export const isAuth = async (req, res, next) => {
  const authHeader = req.get("Authorization");

  try {
    if (!authHeader) {
      createError(401, "Not authenticated");
    }

    const token = authHeader.split(" ")[1];

    let decodedtoken;

    decodedtoken = jwt.verify(token, process.env.PRIVATE_KEY);
    if (!decodedtoken) {
      createError(401, "Not authenticated");
    }

    req.userId = decodedtoken.userId;

    const user = await User.findById(decodedtoken.userId, { _id: 1 });
    if (!user) {
      createError(404, "There is no user with this ID");
    }

    req.userId = user._id;
    next();
  } catch (error) {
    next(error);
  }
};

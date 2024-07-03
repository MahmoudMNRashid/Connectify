import mongoose from "mongoose";
import { pageCategories } from "../util/helpers.js";
const Schema = mongoose.Schema;

const pageSchema = new Schema(
  {
    name: { type: String, required: true },
    categories: [{ type: String, enum: pageCategories, required: true }],
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    cover: Object,
    logo: Object,
    bio: String,
    posts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    ratings: [
      {
        by: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        value: { type: Number, enum: [1, 2, 3, 4, 5] },
        comment: String,
        ratingDate: Date,
      },
    ],
    education: {
      college: [{ name: String, graduated: Boolean }],
      highSchool: [{ name: String, year: Number }],
    },
    phoneNumber: Number,
    placesLived: {
      homeTown: String,
      currentCity: String,
    },
    birthDay: { type: String,  }, //
    gender: { type: String,  },
    email: String,
    usersLiked: [{ type: Schema.Types.ObjectId, ref: "User" }],
    usersBlocked: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        date: Date,
        _id: false,
      },
    ],
  },
  { timestamps: true }
);
pageSchema.index({ name: "text", categories: "text" });
export default mongoose.model("Page", pageSchema);

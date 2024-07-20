import mongoose from "mongoose";
import { groupRoles } from "../util/roles.js";
import { whoCanComment_Page } from "../util/configPage.js";
import { whoCanComment_Profile } from "../util/configProfile.js";
const Schema = mongoose.Schema;

const postSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    description: String,
    assets: [],
    comments: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        description: String,
        assets: [],
        createdAt: { type: Date, required: true },
        //this is for group
        role: {
          type: String,
          enum: [groupRoles.MEMBER, groupRoles.ADMIN, groupRoles.MODERATOR],
        },
      },
    ],
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
    },
    page: { type: Schema.Types.ObjectId, ref: "Page" },
    profile: { type: Schema.Types.ObjectId, ref: "User" },
    link: { type: String },
    //this is for profile and page
    // public for two    - friends for profile  - followers for page
    whoCanComment: {
      type: String,
      enum: [
        whoCanComment_Page.PUBLIC,
        whoCanComment_Profile.FRIENDS,
        whoCanComment_Page.FOLLOWERS,
      ],
    },
    whoCanSee: {
      type: String,
      enum: [
        whoCanComment_Page.PUBLIC,
        whoCanComment_Profile.FRIENDS,
        whoCanComment_Page.FOLLOWERS,
      ],
    },
    //this is for group:
    userRole: {
      type: String,
      enum: [groupRoles.MEMBER, groupRoles.ADMIN, groupRoles.MODERATOR],
    },

    immediate: {
      type: Boolean,
    },
  },

  { timestamps: true }
);

postSchema.index({ description: "text" });
postSchema.index({ group: 1 });
postSchema.index({ page: 1 });
postSchema.index({ profile: 1 });
postSchema.index({ userId: 1 });
postSchema.index({ updatedAt: -1 });

export default mongoose.model("Post", postSchema);

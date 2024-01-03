import mongoose from "mongoose";
const Schema = mongoose.Schema;

const groupSchema = new Schema(
  {
    name: { type: String, required: true },
    privacy: { type: String, required: true, enum: ["public", "private"] },
    visibility: { type: String, required: true, enum: ["visible", "hidden"] }, //visible //hidden
    moderator: { type: Schema.Types.ObjectId, ref: "User", required: true },
    description: String,
    coverPhoto: Object,
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    admins: [{ type: Schema.Types.ObjectId, ref: "User" }],
    posts: [
      {
        postId: { type: Schema.Types.ObjectId, ref: "Post" },
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        from: String,
      },
    ],
    requestPosts: [
      {
        postId: { type: Schema.Types.ObjectId, ref: "Post" },
        userId: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
    whoCanPost: {
      type: String,
      enum: ["anyone", "adminsAndModerator"],
      default: "adminsAndModerator",
    },
    whoCanApproveMemberRequest: {
      type: String,
      enum: ["anyone", "adminsAndModerator"],
      default: "adminsAndModerator",
    },
    immediatePost: { type: Boolean, default: true },
    link: String,
    joiningRequests: [{ type: Schema.Types.ObjectId, ref: "User" }],
    sentInvites: [
      {
        senderId: { type: Schema.Types.ObjectId, ref: "User" },
        senderType: { type: String, enum: ["member", "admin", "moderator"] },
        addressee: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },

  { timestamps: true }
);
export default mongoose.model("group", groupSchema);

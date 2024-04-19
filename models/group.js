import mongoose from "mongoose";
import {
  WhoCanPostorApproveMemberRequest,
  privacy,
  visibility,
} from "../util/configGroup.js";
const Schema = mongoose.Schema;

const groupSchema = new Schema(
  {
    name: { type: String, required: true },
    description: String,
    cover: Object,
    privacy: { type: String, required: true, enum: [privacy.PUBLIC,privacy.PRIVATE] },
    visibility: {
      type: String,
      required: true,
      enum: [visibility.HIDDEN, visibility.VISIBLE],
    }, //visible //hidden
    whoCanPost: {
      type: String,
      enum: [
        WhoCanPostorApproveMemberRequest.ANY_ONE_IN_GROUP,
        WhoCanPostorApproveMemberRequest.ADMINS_AND_MODERATOR,
      ],
      default: WhoCanPostorApproveMemberRequest.ADMINS_AND_MODERATOR,
    },
    whoCanApproveMemberRequest: {
      type: String,
      enum: [
        WhoCanPostorApproveMemberRequest.ANY_ONE_IN_GROUP,
        WhoCanPostorApproveMemberRequest.ADMINS_AND_MODERATOR,
      ],
      default: WhoCanPostorApproveMemberRequest.ADMINS_AND_MODERATOR,
    },
    immediatePost: { type: Boolean, default: true },

    moderator: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [
      {
        _id: false,
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        joiningDate: Date,
      },
    ],
    admins: [
      {
        _id: false,
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        joiningDate: Date,
      },
    ],
    posts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    requestPosts: [
      {
        _id: false,
        postId: { type: Schema.Types.ObjectId, ref: "Post" },
        ownerId: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],

    joiningRequests: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        requestDate: Date,
        _id: false,
      },
    ],

    reports: [
      {
        from: { type: Schema.Types.ObjectId, ref: "User" },
        description: { type: String, required: true },
        postId: { type: Schema.Types.ObjectId, ref: "Post" },
        idOfOwnerPost: { type: Schema.Types.ObjectId, ref: "User" }, //for later when get
        reportDate: Date,
      },
    ],
    reportsFromAdmin: [
      //this come just for moderator
      {
        from: { type: Schema.Types.ObjectId, ref: "User" },
        description: { type: String, Required: true },
        postId: { type: Schema.Types.ObjectId, ref: "Post" },
        idOfOwnerPost: { type: Schema.Types.ObjectId, ref: "User" },
        reportDate: Date,
      },
    ],
    membersBlocked: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },

  { timestamps: true }
);

groupSchema.index({ name: "text", description: "text" });

export default mongoose.model("Group", groupSchema);

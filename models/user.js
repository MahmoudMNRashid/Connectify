import mongoose from "mongoose";
import { groupRoles } from "../util/roles.js";
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    firstName: { type: String, required: true }, //
    lastName: { type: String, required: true }, //
    canChangeName: Date, //
    email: { type: String, required: true }, //
    birthDay: { type: String, required: true }, //
    gender: { type: String, required: true }, //
    password: { type: String, required: true }, //
    role: { type: String, required: true }, //
    confirm: { type: Boolean, default: false }, //
    confirmationToken: { type: String }, //
    resetPasswordToken: { type: String }, //
    resetPasswordTokenExpire: { type: Date }, //
    bio: String, //
    profilePhotos: [{ asset: Object, date: Date, _id: false }], //
    backgroundPhotos: Object, //
    friends: [{ type: Schema.Types.ObjectId, ref: "User" }],
    friendsRequestSend: [
      {
        to: { type: Schema.Types.ObjectId, ref: "User" },
        dateSending: Date,
        _id: false,
      },
    ],
    friendsRequestRecieve: [
      {
        from: { type: Schema.Types.ObjectId, ref: "User" },
        dateSending: Date,
        _id: false,
      },
    ],

    posts: [{ type: Schema.Types.ObjectId, ref: "Post" }], //

    groups: [{ type: Schema.Types.ObjectId, ref: "Group" }],

    likedPages: [{ type: Schema.Types.ObjectId, ref: "Page" }],
    education: {
      college: [{ name: String, graduated: Boolean }],
      highSchool: [{ name: String, year: Number }],
    },
    phoneNumber: Number,
    placesLived: {
      homeTown: String,
      currentCity: String,
    },
    sentInvitesFromGroups: [
      {
        senderId: { type: Schema.Types.ObjectId, ref: "User" },
        senderRole: {
          type: String,
          enum: [groupRoles.MEMBER, groupRoles.ADMIN, groupRoles.MODERATOR],
        },
        groupId: { type: Schema.Types.ObjectId, ref: "Group" },
        inviteDate: Date,
      },
    ],

    sentInvitesFromPage: [
      {
        senderId: { type: Schema.Types.ObjectId, ref: "User" },
        pageId: { type: Schema.Types.ObjectId, ref: "Post" },
        inviteDate: Date,
      },
    ],
    blockedGroups: [{ type: Schema.Types.ObjectId, ref: "Group", default: [] }], //not for users for me(backend) when get data
    blockedPages: [{ type: Schema.Types.ObjectId, ref: "Page", default: [] }], //not for users for me(backend) when get data
    blockedProfiles: [
      { type: Schema.Types.ObjectId, ref: "User", default: [] },
    ], //not for users for me(backend) when get data
    ownedPage: [{ type: Schema.Types.ObjectId, ref: "Page" }],
    profilesYouBlocked: [
      { type: Schema.Types.ObjectId, ref: "User", default: [] },
    ],
    //requirement:block someOne ==> just for profiles
  },
  { timestamps: true }
);
userSchema.index({ firstName: "text", lastName: "text" });
export default mongoose.model("User", userSchema);

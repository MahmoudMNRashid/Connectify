import mongoose from "mongoose";
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
    bio: Object, //
    profilePhotos: Array, //
    backgroundPhotos: Array, //
    friends: [{ type: Schema.Types.ObjectId, ref: "User" }],
    friendsRequestSend: [{ type: Schema.Types.ObjectId, ref: "User" }],
    friendsRequestRecieve: [{ type: Schema.Types.ObjectId, ref: "User" }],

    posts: [{ type: Schema.Types.ObjectId, ref: "Post" }], //

    groups: [
      { groupId: { type: Schema.Types.ObjectId, ref: "Group" }, role: {type:String,enum:['member','admin','moderator']} },
    ], //role:admin - member - moderator

    pagesYouLike: [{ type: Schema.Types.ObjectId, ref: "Group" }],
    education: {
      //
      college: [{ name: String, graduated: Boolean }],
      highSchool: [{ name: String, year: Number }],
    },
    phoneNumber: Number, //
    placesLived: {
      //
      homeTown: [{ name: String }],
      currentCity: [{ name: String }],
    },
    sentInvitesFromGroups: [
      {
        senderId: { type: Schema.Types.ObjectId, ref: "User" },
        senderType: { type: String, enum: ["member", "admin", "moderator"] },
        groupId: { type: Schema.Types.ObjectId, ref: "Group" },
      },
    ],
    joiningRequestsToGroups: [{ type: Schema.Types.ObjectId, ref: "Group" }],
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);

import mongoose from "mongoose";

const Schema = mongoose.Schema;

const postSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    description: String,
    assets: [],
    comments: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        content: String,
        photo: String,
        video: String,
        createdAt: { type: Date, required: true },
      },
    ],
    likes: [Schema.Types.ObjectId],
    group: { type: Schema.Types.ObjectId, ref: "Group" }, // in middleware we add if group not undifined --> this is from group
    page: { type: Schema.Types.ObjectId, ref: "Page" }, //....
    profile: { type: Schema.Types.ObjectId, ref: "User" },
    link: { type: String },
  },

  { timestamps: true }
);
export default mongoose.model("Post", postSchema);

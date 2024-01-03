import express from "express";
import mongoose from "mongoose";

export const app = express();
export const port = 8080;
export const host = `http://localhost:${port}`;

export const connect = async () => {
  try {
    await mongoose.connect(
      "mongodb://MahmoudRashid:27017/Connecify?replicaSet=rs"
    );

    const server = app.listen(port);
    console.log(`Connected to port ${port}`);
    server.timeout = 600000;
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    throw error;
  }
};

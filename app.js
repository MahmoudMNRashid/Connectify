import { connect, app } from "./util/connect.js";
import bodyParser from "body-parser";
import multer from "multer";
import dotenv from 'dotenv'
dotenv.config()

console.log( process.env.CONFIG_EMAIL_FROM)
console.log(process.env.CONFIG_EMAIL_SERVICE_USER)
console.log(process.env.CONFIG_EMAIL_SERVICE_PASS)
import authRoute from "./routes/auth.js";
import postRoute from "./routes/post.js";
import profileRoute from "./routes/profile.js";
import groupRoute from './routes/group.js'
import { storage } from "./util/file.js";
import cloudinary from "cloudinary";

cloudinary.config({
  cloud_name: "dmddv8y8f",
  api_key: "549329542696569",
  api_secret: "-GdJcVolsFu3Nk3HBpLv5Ndyw0o",
});

connect();


app.post('/test', multer({ storage }).single('video'), (req, res) => {
  // Access the uploaded video file in req.file.buffer
  const videoBuffer = req.file.buffer;

  // Upload the video buffer to Cloudinary
  cloudinary.v2.uploader.upload_stream({timeout: 600000,}, (error, result) => {
    if (error) {
      return res.status(500).json({ error: 'Failed to upload video to Cloudinary' });
    }

    // Here, you can use result.url or result.public_id as needed

    res.status(200).json({ url: result.url, public_id: result.public_id });
  }).end(videoBuffer);
});


app.use(bodyParser.json()); // application/json
app.use(multer({ storage }).array("assets"));






app.use("/auth", authRoute);
app.use("/post", postRoute);
app.use("/profile", profileRoute);
app.use("/group", groupRoute);
app.use((error, req, res, next) => {
  console.log(error);

  const status = error.statusCode||error.error.http_code || 500;
  const message = error.message ||error.error || "Something Accurr";
  const data = error.data || null;

  if (error.data) {
    res.status(status).json({ message, data });
  } else {
    res.status(status).json({ message });
  }
});


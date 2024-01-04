import { connect, app } from "./util/connect.js";
import bodyParser from "body-parser";
import multer from "multer";
import dotenv from 'dotenv'
dotenv.config()


import authRoute from "./routes/auth.js";
import postRoute from "./routes/post.js";
import profileRoute from "./routes/profile.js";
import groupRoute from './routes/group.js'
import { storage } from "./util/file.js";


connect();


app.get('/test', (req, res) => {
res.status(200).json({message:'Hello World'})
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


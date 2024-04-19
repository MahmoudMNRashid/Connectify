import multer from "multer";
import sharp from "sharp";
import cloudinary from "cloudinary";
import dotenv from "dotenv";
import { createError } from "./helpers.js";
dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const storage = multer.memoryStorage();

export const uploadAssets = async (assets, folder) => {
  const uploadResults = await Promise.all(
    assets.map(async (asset) => {
      const buffer = asset.buffer;
      const resourceType = asset.mimetype.startsWith("image/")
        ? "image"
        : "video";
      try {
        let compressedBuffer;

        if (resourceType === "image") {
          compressedBuffer = await sharp(buffer)
            .resize({ width: 800 })
            .toBuffer();
        } else {
          compressedBuffer = buffer; // For videos, no compression (Cloudinary will handle transcoding)
        }

        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.v2.uploader.upload_stream(
            { resource_type: resourceType, folder: folder, timeout: 600000 },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(compressedBuffer);
        });
        return {
          public_id: result.public_id,
          link: result.secure_url,
          resource_type: resourceType,
        };
      } catch (error) {
        throw error;
      }
    })
  );

  // Filter out null results (failed uploads)
  return uploadResults;
};

export const deleteAssets = async (assets) => {
  try {
    console.log(assets)
    console.log("start");
    assets.forEach(async (asset) => {
      if (asset.resource_type === "image") {
        console.log("its image");
        const result = await cloudinary.v2.uploader.destroy(asset.public_id);
        console.log(result);
      } else if (asset.resource_type === "video") {
        console.log("its video ");
        const result = await cloudinary.v2.uploader.destroy(asset.public_id, {
          resource_type: "video",
        });
        console.log(result);
      } else {
        const error = new Error("Unknown resource_type");
        error.statusCode = 404;
        throw error;
      }
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    throw error;
  }
};

export const deleteFolder = async (path) => {
  const result = await cloudinary.v2.api.delete_folder(path);
  console.log(result);
};
export const fileFilterPhotosAndVideos = (assets) => {
  const allowedImageTypes = ["image/png", "image/jpg", "image/jpeg"];
  const allowedVideoTypes = [
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/x-matroska",
  ];

  const maxImageSize = 10 * 1024 * 1024; // 10 MB
  const maxVideoSize = 100 * 1024 * 1024; // 100 MB
  for (const file of assets) {
    if (
      (allowedImageTypes.includes(file.mimetype) &&
        file.size <= maxImageSize) ||
      (allowedVideoTypes.includes(file.mimetype) && file.size <= maxVideoSize)
    ) {
      continue;
    } else {
      createError(422, `Invalid file: ${file.originalname} or Size too big`);
    }
  }
  return true;
};

export const FilterPhotoTypeAndSize = (assets) => {
  const allowedImageTypes = ["image/png", "image/jpg", "image/jpeg"];
  const maxImageSize = 10 * 1024 * 1024; // 10 MB
  for (const file of assets) {
    if (
      allowedImageTypes.includes(file.mimetype) &&
      file.size <= maxImageSize
    ) {
      continue;
    } else {
      createError(422, `Invalid file: ${file.originalname} Should be png,jpg,jpeg and size should be less 10 MB`);
    }
  }
  return true;
};

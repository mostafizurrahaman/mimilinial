import {
   v2 as cloudinary,
   type UploadApiOptions,
   type UploadApiResponse,
} from "cloudinary";
import streamifier from "streamifier";

import httpStatus from "http-status";
import { configs } from "../../configs";
import { AppError } from "../../errors";

cloudinary.config({
   cloud_name: configs?.cloudinary.cloudinaryCloudName,
   api_key: configs?.cloudinary?.cloudinaryApiKey,
   api_secret: configs?.cloudinary?.cloudinaryApiSecret,
});

const uploadFileIntoCloudinary = (
   file: Express.Multer.File,
   folder: string,
): Promise<UploadApiResponse | undefined> => {
   return new Promise((resolve, reject) => {
      const resourceType = file?.mimetype?.startsWith("image/")
         ? "image"
         : file?.mimetype?.startsWith("video/")
           ? "video"
           : "auto";

      const steam = cloudinary.uploader.upload_stream(
         {
            folder,
            resource_type: resourceType,
         },
         (err, result) => {
            if (err) {
               return reject(
                  new AppError(
                     httpStatus.BAD_REQUEST,
                     `Failed to upload ${file?.mimetype}`,
                  ),
               );
            }
            resolve(result);
         },
      );

      streamifier.createReadStream(file?.buffer)?.pipe(steam);
   });
};

export const uploadMultipleFilesIntoCloudinary = async (
   files: Express.Multer.File[],
   folder: string,
): Promise<string[]> => {
   if (!files?.length) return [];

   const results = await Promise.all(
      files.map((file) => uploadFileIntoCloudinary(file, folder)),
   );

   return results.map((result) => result!.secure_url);
};

export default uploadFileIntoCloudinary;

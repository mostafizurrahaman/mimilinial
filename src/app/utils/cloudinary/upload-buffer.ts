import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import streamifier from "streamifier";

import httpStatus from "http-status";
import { AppError } from "@/app/errors";

export const uploadBufferIntoCloudinary = (
  buffer: Buffer,
  folder: string,
  filename: string = "invoice",
): Promise<UploadApiResponse | undefined> => {
  return new Promise((resolve, reject) => {
    const steam = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "raw", // Use raw for PDF files
        public_id: filename.replace(/\.[^/.]+$/, ""), // Remove extension if any
        format: "pdf",
      },
      (err, result) => {
        if (err) {
          return reject(
            new AppError(
              httpStatus.BAD_REQUEST,
              `Failed to upload PDF to Cloudinary: ${err.message}`,
            ),
          );
        }
        resolve(result);
      },
    );

    streamifier.createReadStream(buffer).pipe(steam);
  });
};

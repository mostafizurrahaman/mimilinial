import httpStatus from "http-status";
import { mediaServices } from "./media.services";
import { sendResponse, catchAsync } from "../../utils";
import type { TMulterFile } from "@/app/interfaces/multer.types";

// 1. CREATE MEDIA
const createMedia = catchAsync(async (req, res) => {
  const userId = req.user?._id;

  const file = req.file as TMulterFile;
  const result = await mediaServices.createMedia(userId, file);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "The media created successfully!",
    data: result,
  });
});

// 3. GET ALL MEDIA
const getAllMedia = catchAsync(async (req, res) => {
  const result = await mediaServices.getAllMedia(req.validQuery);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The media retrieved successfully!",
    data: result.data,
    meta: result.meta,
  });
});

export const mediaControllers = {
  createMedia,

  getAllMedia,
};

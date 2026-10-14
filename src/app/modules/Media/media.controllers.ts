import httpStatus from "http-status";
import { mediaServices } from "./media.services";
import { sendResponse, catchAsync } from "../../utils";

// 1. CREATE MEDIA
const createMedia = catchAsync(async (req, res) => {

   const userId = req.user?._id

   const file = req.file
   const result = await mediaServices.createMedia(userId);

   sendResponse(res, {
      statusCode: httpStatus.CREATED,
      message: "The media created successfully!",
      data: result,
   });
});

// 2. UPDATE MEDIA
const updateMedia = catchAsync(async (req, res) => {
   const result = await mediaServices.updateMedia(
      req.params.id as string,
      req.body,
   );

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The media updated successfully!",
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

// 4. GET MEDIA BY ID
const getMediaById = catchAsync(async (req, res) => {
   const result = await mediaServices.getMediaById(req.params.id as string);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The media retrieved successfully!",
      data: result,
   });
});

// 5. DELETE MEDIA BY ID
const deleteMediaById = catchAsync(async (req, res) => {
   const result = await mediaServices.deleteMediaById(req.params.id as string);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The media deleted successfully!",
      data: result,
   });
});

export const mediaControllers = {
   createMedia,
   updateMedia,
   getAllMedia,
   getMediaById,
   deleteMediaById,
};

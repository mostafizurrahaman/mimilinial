import httpStatus from "http-status";
import { trackServices } from "./track.services";
import { sendResponse, catchAsync, getUserFromRequest } from "../../utils";

// 1. CREATE TRACK
const createTrack = catchAsync(async (req, res) => {
   const user = await getUserFromRequest(req);
   const result = await trackServices.createTrack(user, req.body);

   sendResponse(res, {
      statusCode: httpStatus.CREATED,
      message: "The track created successfully!",
      data: result,
   });
});

// 2. UPDATE TRACK
const updateTrack = catchAsync(async (req, res) => {
   const result = await trackServices.updateTrack(
      req.params.id as string,
      req.body,
   );

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The track updated successfully!",
      data: result,
   });
});

// 3. GET ALL TRACK
const getAllTrack = catchAsync(async (req, res) => {
   const result = await trackServices.getAllTrack(req.validQuery);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The track retrieved successfully!",
      data: result.data,
      meta: result.meta,
   });
});
// 3. GET ALL TRACK
const getAllPublishedTracks = catchAsync(async (req, res) => {
   const result = await trackServices.getAllPublishedTracks(req.validQuery);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "All published tracks are retrieved successfully!",
      data: result.data,
      meta: result.meta,
   });
});

// 4. GET TRACK BY ID
const getTrackById = catchAsync(async (req, res) => {
   const result = await trackServices.getTrackById(req.params.id as string);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The track retrieved successfully!",
      data: result,
   });
});

// 5. DELETE TRACK BY ID
const deleteTrackById = catchAsync(async (req, res) => {
   const result = await trackServices.deleteTrackById(req.params.id as string);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The track deleted successfully!",
      data: result,
   });
});

// 6. Mark as Published
const markAsPublished = catchAsync(async (req, res) => {
   const result = await trackServices.markAsPublished(req.params.id as string);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The track published successfully!",
      data: result,
   });
});

// 7. Mark as Archived
const markAsArchived = catchAsync(async (req, res) => {
   const result = await trackServices.markAsArchived(req.params.id as string);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The track archived successfully!",
      data: result,
   });
});

export const trackControllers = {
   createTrack,
   updateTrack,
   getAllTrack,
   getTrackById,
   deleteTrackById,
   getAllPublishedTracks,
   markAsPublished,
   markAsArchived,
};

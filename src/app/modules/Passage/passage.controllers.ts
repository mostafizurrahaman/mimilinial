import httpStatus from "http-status";
import { passageServices } from "./passage.services";
import { sendResponse, catchAsync, getUserFromRequest } from "../../utils";
import type { IPassageFile } from "./passage.interfaces";

// 1. CREATE PASSAGE
const createPassage = catchAsync(async (req, res) => {
   const user = await getUserFromRequest(req);
   const files = req.files as unknown as IPassageFile;
   const result = await passageServices.createPassage(user, req.body, files);

   sendResponse(res, {
      statusCode: httpStatus.CREATED,
      message: "The passage created successfully!",
      data: result,
   });
});

// 2. UPDATE PASSAGE
const updatePassage = catchAsync(async (req, res) => {
   const user = await getUserFromRequest(req);
   const files = req.files as unknown as IPassageFile;
   const result = await passageServices.updatePassage(
      req.params.id as string,
      req.body,
      files,
   );

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The passage updated successfully!",
      data: result,
   });
});

// 3. GET ALL PASSAGE
const getAllPassage = catchAsync(async (req, res) => {
   const result = await passageServices.getAllPassage(req.validQuery);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The passage retrieved successfully!",
      data: result.data,
      meta: result.meta,
   });
});

// 4. GET PASSAGE BY ID
const getPassageById = catchAsync(async (req, res) => {
   const result = await passageServices.getPassageById(req.params.id as string);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The passage retrieved successfully!",
      data: result,
   });
});

// 5. DELETE PASSAGE BY ID
const deletePassageById = catchAsync(async (req, res) => {
   const result = await passageServices.deletePassageById(
      req.params.id as string,
   );

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The passage deleted successfully!",
      data: result,
   });
});

export const passageControllers = {
   createPassage,
   updatePassage,
   getAllPassage,
   getPassageById,
   deletePassageById,
};

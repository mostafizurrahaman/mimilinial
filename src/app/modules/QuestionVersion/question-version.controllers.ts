import httpStatus from "http-status";
import { questionVersionServices } from "./question-version.services";
import { sendResponse, catchAsync } from "../../utils";

// 1. CREATE QUESTION VERSION
const createQuestionVersion = catchAsync(async (req, res) => {
   const result = await questionVersionServices.createQuestionVersion(req.body);

   sendResponse(res, {
      statusCode: httpStatus.CREATED,
      message: "The question version created successfully!",
      data: result,
   });
});

// 2. UPDATE QUESTION VERSION
const updateQuestionVersion = catchAsync(async (req, res) => {
   const result = await questionVersionServices.updateQuestionVersion(
      req.params.id as string,
      req.body,
   );

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The question version updated successfully!",
      data: result,
   });
});

// 3. GET ALL QUESTION VERSION
const getAllQuestionVersion = catchAsync(async (req, res) => {
   const result = await questionVersionServices.getAllQuestionVersion(req.validQuery);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The question version retrieved successfully!",
      data: result.data,
      meta: result.meta,
   });
});

// 4. GET QUESTION VERSION BY ID
const getQuestionVersionById = catchAsync(async (req, res) => {
   const result = await questionVersionServices.getQuestionVersionById(req.params.id as string);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The question version retrieved successfully!",
      data: result,
   });
});

// 5. DELETE QUESTION VERSION BY ID
const deleteQuestionVersionById = catchAsync(async (req, res) => {
   const result = await questionVersionServices.deleteQuestionVersionById(req.params.id as string);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The question version deleted successfully!",
      data: result,
   });
});

export const questionVersionControllers = {
   createQuestionVersion,
   updateQuestionVersion,
   getAllQuestionVersion,
   getQuestionVersionById,
   deleteQuestionVersionById,
};

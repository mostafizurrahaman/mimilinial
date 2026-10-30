import httpStatus from "http-status";
import { questionMappingServices } from "./question-mapping.services";
import { sendResponse, catchAsync } from "../../utils";

// 1. CREATE QUESTION MAPPING
const createQuestionMapping = catchAsync(async (req, res) => {
  const user = req.user;
  const result = await questionMappingServices.createQuestionMapping(
    user,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "The question mapping created successfully!",
    data: result,
  });
});

// 2. UPDATE QUESTION MAPPING
const updateQuestionMapping = catchAsync(async (req, res) => {
  const user = req.user;
  const result = await questionMappingServices.updateQuestionMapping(
    user,
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The question mapping updated successfully!",
    data: result,
  });
});

// 3. GET ALL QUESTION MAPPING
const getAllQuestionMapping = catchAsync(async (req, res) => {
  const result = await questionMappingServices.getAllQuestionMapping(
    req.validQuery,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The question mapping retrieved successfully!",
    data: result.data,
    meta: result.meta,
  });
});

// 4. GET QUESTION MAPPING BY ID
const getQuestionMappingById = catchAsync(async (req, res) => {
  const result = await questionMappingServices.getQuestionMappingById(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The question mapping retrieved successfully!",
    data: result,
  });
});

// 5. DELETE QUESTION MAPPING BY ID
const deleteQuestionMappingById = catchAsync(async (req, res) => {
  const result = await questionMappingServices.deleteQuestionMappingById(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The question mapping deleted successfully!",
    data: result,
  });
});

export const questionMappingControllers = {
  createQuestionMapping,
  updateQuestionMapping,
  getAllQuestionMapping,
  getQuestionMappingById,
  deleteQuestionMappingById,
};

import httpStatus from "http-status";
import { examServices } from "./exam.services";
import { sendResponse, catchAsync } from "../../utils";

// 1. CREATE EXAM
const createExam = catchAsync(async (req, res) => {
   const result = await examServices.createExam(req.body);

   sendResponse(res, {
      statusCode: httpStatus.CREATED,
      message: "The exam created successfully!",
      data: result,
   });
});

// 2. UPDATE EXAM
const updateExam = catchAsync(async (req, res) => {
   const result = await examServices.updateExam(
      req.params.id as string,
      req.body,
   );

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The exam updated successfully!",
      data: result,
   });
});

// 3. GET ALL EXAM
const getAllExam = catchAsync(async (req, res) => {
   const result = await examServices.getAllExam(req.validQuery);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The exam retrieved successfully!",
      data: result.data,
      meta: result.meta,
   });
});

// 4. GET EXAM BY ID
const getExamById = catchAsync(async (req, res) => {
   const result = await examServices.getExamById(req.params.id as string);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The exam retrieved successfully!",
      data: result,
   });
});

// 5. DELETE EXAM BY ID
const deleteExamById = catchAsync(async (req, res) => {
   const result = await examServices.deleteExamById(req.params.id as string);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The exam deleted successfully!",
      data: result,
   });
});

export const examControllers = {
   createExam,
   updateExam,
   getAllExam,
   getExamById,
   deleteExamById,
};

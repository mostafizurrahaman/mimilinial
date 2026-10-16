import httpStatus from "http-status";
import { questionsServices } from "./questions.services";
import { sendResponse, catchAsync } from "../../utils";

// 1. CREATE SINGLE QUESTIONS

const createQuestions = catchAsync(async (req, res) => {
  const user = req.user;
  const result = await questionsServices.createQuestions(user, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "The questions created successfully!",
    data: result,
  });
});

// const createQuestions = catchAsync(async (req, res) => {
//   const result = await questionsServices.createQuestions(req.body);

//   sendResponse(res, {
//     statusCode: httpStatus.CREATED,
//     message: "The questions created successfully!",
//     data: result,
//   });
// });

// 2. UPDATE QUESTIONS
const updateQuestions = catchAsync(async (req, res) => {
  const result = await questionsServices.updateQuestions(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The questions updated successfully!",
    data: result,
  });
});

// 3. GET ALL QUESTIONS
const getAllQuestions = catchAsync(async (req, res) => {
  const result = await questionsServices.getAllQuestions(req.validQuery);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The questions retrieved successfully!",
    data: result.data,
    meta: result.meta,
  });
});

// 4. GET QUESTIONS BY ID
const getQuestionsById = catchAsync(async (req, res) => {
  const result = await questionsServices.getQuestionsById(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The questions retrieved successfully!",
    data: result,
  });
});

// 5. DELETE QUESTIONS BY ID
const deleteQuestionsById = catchAsync(async (req, res) => {
  const result = await questionsServices.deleteQuestionsById(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The questions deleted successfully!",
    data: result,
  });
});

export const questionsControllers = {
  createQuestions,
  updateQuestions,
  getAllQuestions,
  getQuestionsById,
  deleteQuestionsById,
};

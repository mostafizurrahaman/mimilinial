import httpStatus from "http-status";
import { questionsServices } from "./questions.services";
import { sendResponse, catchAsync } from "../../utils";

// 1. CREATE SINGLE MCQ QUESTIONS
const createSingleMcqQuestion = catchAsync(async (req, res) => {
  const user = req.user;
  const result = await questionsServices.createSingleMcqQuestion(
    user,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "The single mcq questions created successfully!",
    data: result,
  });
});

// 2. CREATE MULTI MCQ QUESTIONS
const createMultiMcqQuestion = catchAsync(async (req, res) => {
  const user = req.user;

  const result = await questionsServices.createMultiMcqQuestion(user, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "The multiple-choice question created successfully!",
    data: result,
  });
});

// 3. CREATE TRUE FALSE QUESTIONS
const createTrueFalseQuestion = catchAsync(async (req, res) => {
  const user = req.user;

  const result = await questionsServices.createTrueFalseQuestion(
    user,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "The true/false question created successfully!",
    data: result,
  });
});

// 4. CREATE FILL IN THE BLANK QUESTIONS
const createFillBlankQuestion = catchAsync(async (req, res) => {
  const user = req.user;

  const result = await questionsServices.createFillBlankQuestion(
    user,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "The fill-in-the-blank question created successfully!",
    data: result,
  });
});

// 5. CREATE MATCHING QUESTIONS
const createMatchingQuestion = catchAsync(async (req, res) => {
  const user = req.user;

  const result = await questionsServices.createMatchingQuestion(user, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "The matching question created successfully!",
    data: result,
  });
});

// 6. CREATE ORDERING QUESTIONS
const createOrderingQuestion = catchAsync(async (req, res) => {
  const user = req.user;

  const result = await questionsServices.createOrderingQuestion(user, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "The ordering question created successfully!",
    data: result,
  });
});

export const questionsControllers = {
  createSingleMcqQuestion,
  createMultiMcqQuestion,
  createTrueFalseQuestion,
  createFillBlankQuestion,
  createMatchingQuestion,
  createOrderingQuestion,
};

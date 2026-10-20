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

// 7. UPDATE SINGLE MCQ QUESTION
const updateSingleMcqQuestion = catchAsync(async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const result = await questionsServices.updateSingleMcqQuestion(
    id as string,
    user,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The single mcq question updated successfully!",
    data: result,
  });
});

// 8. UPDATE MULTI MCQ QUESTION
const updateMultiMcqQuestion = catchAsync(async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const result = await questionsServices.updateMultiMcqQuestion(
    id as string,
    user,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The multiple-choice question updated successfully!",
    data: result,
  });
});

// 9. UPDATE TRUE FALSE QUESTION
const updateTrueFalseQuestion = catchAsync(async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const result = await questionsServices.updateTrueFalseQuestion(
    id as string,
    user,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The true/false question updated successfully!",
    data: result,
  });
});

// 10. UPDATE FILL IN THE BLANK QUESTION
const updateFillBlankQuestion = catchAsync(async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const result = await questionsServices.updateFillBlankQuestion(
    id as string,
    user,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The fill-in-the-blank question updated successfully!",
    data: result,
  });
});

// 11. UPDATE MATCHING QUESTION
const updateMatchingQuestion = catchAsync(async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const result = await questionsServices.updateMatchingQuestion(
    id as string,
    user,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The matching question updated successfully!",
    data: result,
  });
});

// 12. UPDATE ORDERING QUESTION
const updateOrderingQuestion = catchAsync(async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const result = await questionsServices.updateOrderingQuestion(
    id as string,
    user,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The ordering question updated successfully!",
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
  updateSingleMcqQuestion,
  updateMultiMcqQuestion,
  updateTrueFalseQuestion,
  updateFillBlankQuestion,
  updateMatchingQuestion,
  updateOrderingQuestion,
};


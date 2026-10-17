import httpStatus from "http-status";
import { questionsServices } from "./questions.services";
import { sendResponse, catchAsync } from "../../utils";

// 1. CREATE SINGLE QUESTIONS

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

const createMultiMcqQuestion = catchAsync(async (req, res) => {
  const user = req.user;

  const result = await questionsServices.createMultiMcqQuestion(user, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "The multiple-choice question created successfully!",
    data: result,
  });
});

export const questionsControllers = {
  createSingleMcqQuestion,
  createMultiMcqQuestion,
};

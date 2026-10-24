import httpStatus from "http-status";
import { pastExamServices } from "./past-exam.services";
import { sendResponse, catchAsync } from "../../utils";

// 1. CREATE PAST EXAM
const createPastExam = catchAsync(async (req, res) => {
  const user = req.user;
  const result = await pastExamServices.createPastExam(user, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "The past exam created successfully!",
    data: result,
  });
});

// 2. UPDATE PAST EXAM
const updatePastExam = catchAsync(async (req, res) => {
  const result = await pastExamServices.updatePastExam(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The past exam updated successfully!",
    data: result,
  });
});

// 3. GET ALL PAST EXAM
const getAllPastExam = catchAsync(async (req, res) => {
  const result = await pastExamServices.getAllPastExam(req.validQuery);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The past exam retrieved successfully!",
    data: result.data,
    meta: result.meta,
  });
});

// 4. GET PAST EXAM BY ID
const getPastExamById = catchAsync(async (req, res) => {
  const result = await pastExamServices.getPastExamById(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The past exam retrieved successfully!",
    data: result,
  });
});

// 5. DELETE PAST EXAM BY ID
const deletePastExamById = catchAsync(async (req, res) => {
  const result = await pastExamServices.deletePastExamById(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The past exam deleted successfully!",
    data: result,
  });
});

export const pastExamControllers = {
  createPastExam,
  updatePastExam,
  getAllPastExam,
  getPastExamById,
  deletePastExamById,
};

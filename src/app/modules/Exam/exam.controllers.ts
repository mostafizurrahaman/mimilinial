import httpStatus from "http-status";
import { examServices } from "./exam.services";
import { sendResponse, catchAsync } from "../../utils";

// 1. CREATE CATEGORY EXAM
const createCategoryExam = catchAsync(async (req, res) => {
  const user = req.user;
  const result = await examServices.createCategoryExam(user, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "The category level exam created successfully!",
    data: result,
  });
});

// 2. CREATE TRACK EXAM
const createTrackExam = catchAsync(async (req, res) => {
  const user = req.user;
  const result = await examServices.createTrackExam(user, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "The track level exam created successfully!",
    data: result,
  });
});

// 3. CREATE SUBJECT EXAM
const createSubjectExam = catchAsync(async (req, res) => {
  const user = req.user;
  const result = await examServices.createSubjectExam(user, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "The subject level exam created successfully!",
    data: result,
  });
});

// 4. CREATE TOPIC EXAM
const createTopicExam = catchAsync(async (req, res) => {
  const user = req.user;
  const result = await examServices.createTopicExam(user, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "The topic level exam created successfully!",
    data: result,
  });
});

// 2. UPDATE EXAM
const updateExam = catchAsync(async (req, res) => {
  const user = req.user;
  const result = await examServices.updateExam(
    user,
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

// 4. GET EXAM BY ID OR SLUG
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

// 6. MARK AS PUBLISHED
const markAsPublished = catchAsync(async (req, res) => {
  const user = req.user;
  const result = await examServices.markAsPublished(
    user,
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The exam published successfully!",
    data: result,
  });
});

// 7. MARK AS ARCHIVED
const markAsArchived = catchAsync(async (req, res) => {
  const user = req.user;
  const result = await examServices.markAsArchived(
    user,
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The exam archived successfully!",
    data: result,
  });
});

// 8. MARK AS DRAFT (UNPUBLISH)
const markAsDraft = catchAsync(async (req, res) => {
  const user = req.user;
  const result = await examServices.markAsDraft(
    user,
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The exam reverted to draft successfully!",
    data: result,
  });
});

export const examControllers = {
  createExam: createCategoryExam,
  createCategoryExam,
  createTrackExam,
  createSubjectExam,
  createTopicExam,
  updateExam,
  getAllExam,
  getExamById,
  deleteExamById,
  markAsPublished,
  markAsArchived,
  markAsDraft,
};

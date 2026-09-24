import httpStatus from "http-status";
import { subjectServices } from "./subject.services";
import { sendResponse, catchAsync, getUserFromRequest } from "../../utils";
import type { ISubjectFiles } from "./subject.interfaces";

// 1. CREATE SUBJECT
const createSubject = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req);
  const files = req.files as unknown as ISubjectFiles;
  const result = await subjectServices.createSubject(user, req.body, files);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "The subject created successfully!",
    data: result,
  });
});

// 2. UPDATE SUBJECT
const updateSubject = catchAsync(async (req, res) => {
  const files = req.files as unknown as ISubjectFiles;
  const result = await subjectServices.updateSubject(
    req.params.id as string,
    req.body,
    files,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The subject updated successfully!",
    data: result,
  });
});

// 3. GET ALL SUBJECT
const getAllSubject = catchAsync(async (req, res) => {
  const result = await subjectServices.getAllSubject(req.validQuery);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The subject retrieved successfully!",
    data: result.data,
    meta: result.meta,
  });
});

const getAllPublishedSubject = catchAsync(async (req, res) => {
  const result = await subjectServices.getAllPublishedSubject(req.validQuery);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "All published subjects are retrieved successfully!",
    data: result.data,
    meta: result.meta,
  });
});

// 4. GET SUBJECT BY ID
const getSubjectById = catchAsync(async (req, res) => {
  const result = await subjectServices.getSubjectById(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The subject retrieved successfully!",
    data: result,
  });
});

// 4. GET SUBJECT BY ID
const getSubjectBySlug = catchAsync(async (req, res) => {
  const result = await subjectServices.getSubjectBySlug(
    req.params.slug as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The subject retrieved successfully!",
    data: result,
  });
});

// 5. DELETE SUBJECT BY ID
const deleteSubjectById = catchAsync(async (req, res) => {
  const result = await subjectServices.deleteSubjectById(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The subject deleted successfully!",
    data: result,
  });
});

// 6. Mark as Published
const markAsPublished = catchAsync(async (req, res) => {
  const result = await subjectServices.markAsPublished(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The subject marked as published successfully!",
    data: result,
  });
});

// 7. Mark as Archived
const markAsArchived = catchAsync(async (req, res) => {
  const result = await subjectServices.markAsArchived(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The subject marked as archived successfully!",
    data: result,
  });
});

//  8. Toggle Featured:
const toggleFeatured = catchAsync(async (req, res) => {
  const result = await subjectServices.toggleFeatured(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result,
  });
});

export const subjectControllers = {
  createSubject,
  updateSubject,
  getAllSubject,
  getSubjectById,
  deleteSubjectById,
  getSubjectBySlug,
  getAllPublishedSubject,
  markAsPublished,
  markAsArchived,
  toggleFeatured,
};

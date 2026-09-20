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

// 4. GET SUBJECT BY ID
const getSubjectById = catchAsync(async (req, res) => {
  const result = await subjectServices.getSubjectById(req.params.id as string);

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

export const subjectControllers = {
  createSubject,
  updateSubject,
  getAllSubject,
  getSubjectById,
  deleteSubjectById,
};

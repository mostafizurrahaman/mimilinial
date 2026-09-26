import httpStatus from "http-status";
import { topicServices } from "./topic.services";
import { sendResponse, catchAsync, getUserFromRequest } from "../../utils";

// 1. CREATE TOPIC
const createTopic = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req);
  const result = await topicServices.createTopic(user, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "The topic created successfully!",
    data: result,
  });
});

// 2. UPDATE TOPIC
const updateTopic = catchAsync(async (req, res) => {
  const result = await topicServices.updateTopic(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The topic updated successfully!",
    data: result,
  });
});

// 3. GET ALL TOPIC
const getAllTopic = catchAsync(async (req, res) => {
  const result = await topicServices.getAllTopic(req.validQuery);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The topic retrieved successfully!",
    data: result.data,
    meta: result.meta,
  });
});

// 3.1 GET ALL PUBLISHED TOPIC
const getAllPublishedTopic = catchAsync(async (req, res) => {
  const result = await topicServices.getAllPublishedTopic(req.validQuery);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "All published topics retrieved successfully!",
    data: result.data,
    meta: result.meta,
  });
});

// 4. GET TOPIC BY ID
const getTopicById = catchAsync(async (req, res) => {
  const result = await topicServices.getTopicById(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The topic retrieved successfully!",
    data: result,
  });
});

// 5. DELETE TOPIC BY ID
const deleteTopicById = catchAsync(async (req, res) => {
  const result = await topicServices.deleteTopicById(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The topic deleted successfully!",
    data: result,
  });
});

// 6. Mark as Published
const markAsPublished = catchAsync(async (req, res) => {
  const result = await topicServices.markAsPublished(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The topic marked as published successfully!",
    data: result,
  });
});

// 7. Mark as Archived
const markAsArchived = catchAsync(async (req, res) => {
  const result = await topicServices.markAsArchived(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "The topic marked as archived successfully!",
    data: result,
  });
});

export const topicControllers = {
  createTopic,
  updateTopic,
  getAllTopic,
  getAllPublishedTopic,
  getTopicById,
  deleteTopicById,
  markAsPublished,
  markAsArchived,
};

import httpStatus from "http-status";
import { userMasteryServices } from "./user-mastery.services";
import { sendResponse, catchAsync } from "../../utils";

// 1. GET WEAK TOPICS
const getWeakTopics = catchAsync(async (req, res) => {
  const result = await userMasteryServices.getWeakTopics(
    req.user._id.toString(),
    req.validQuery,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Weak topics retrieved successfully!",
    data: result.data,
    meta: {
      total: result.totalWeakTopics,
      page: 1,
      limit: result.totalWeakTopics,
      totalPages: 1,
    },
  });
});

// 2. GET STRONG TOPICS
const getStrongTopics = catchAsync(async (req, res) => {
  const result = await userMasteryServices.getStrongTopics(
    req.user._id.toString(),
    req.validQuery,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Strong topics retrieved successfully!",
    data: result.data,
    meta: {
      total: result.totalStrongTopics,
      page: 1,
      limit: result.totalStrongTopics,
      totalPages: 1,
    },
  });
});

// 3. GET MASTERY OVERVIEW DASHBOARD
const getMasteryOverview = catchAsync(async (req, res) => {
  const result = await userMasteryServices.getMasteryOverview(
    req.user._id.toString(),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Mastery overview dashboard retrieved successfully!",
    data: result,
  });
});

// 4. GET SUBJECT MASTERY DETAILS
const getSubjectMasteryDetails = catchAsync(async (req, res) => {
  const result = await userMasteryServices.getSubjectMasteryDetails(
    req.user._id.toString(),
    req.params.subjectId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Subject mastery details retrieved successfully!",
    data: result,
  });
});

export const userMasteryControllers = {
  getWeakTopics,
  getStrongTopics,
  getMasteryOverview,
  getSubjectMasteryDetails,
};

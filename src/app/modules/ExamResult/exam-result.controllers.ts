import httpStatus from "http-status";
import { examResultServices } from "./exam-result.services";
import { sendResponse, catchAsync } from "../../utils";

// 1. GET MY RESULTS
const getMyResults = catchAsync(async (req, res) => {
  const result = await examResultServices.getMyResults(
    req.user._id.toString(),
    req.validQuery,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Your exam results retrieved successfully!",
    data: result.data,
    meta: result.meta,
  });
});

// 2. GET ALL EXAM RESULTS (Admin)
const getAllExamResults = catchAsync(async (req, res) => {
  const result = await examResultServices.getAllExamResults(req.validQuery);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "All exam results retrieved successfully!",
    data: result.data,
    meta: result.meta,
  });
});

// 3. GET RESULT BY ID
const getResultById = catchAsync(async (req, res) => {
  const isAdmin = req.user.role === "admin" || req.user.role === "super_admin";
  const result = await examResultServices.getResultById(
    req.user._id.toString(),
    req.params.id as string,
    isAdmin,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Exam result details retrieved successfully!",
    data: result,
  });
});

// 4. GET RESULT BY ATTEMPT ID
const getResultByAttemptId = catchAsync(async (req, res) => {
  const isAdmin = req.user.role === "admin" || req.user.role === "super_admin";
  const result = await examResultServices.getResultByAttemptId(
    req.user._id.toString(),
    req.params.attemptId as string,
    isAdmin,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Exam result for attempt retrieved successfully!",
    data: result,
  });
});

// 5. GET EXAM LEADERBOARD
const getExamLeaderboard = catchAsync(async (req, res) => {
  const currentUserId = req.user?._id?.toString();
  const result = await examResultServices.getExamLeaderboard(
    req.params.examId as string,
    currentUserId,
    req.validQuery,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Exam leaderboard retrieved successfully!",
    data: {
      exam: result.exam,
      myPosition: result.myPosition,
      leaderboard: result.leaderboard,
    },
    meta: result.meta,
  });
});

// 6. GET GLOBAL LEADERBOARD
const getGlobalLeaderboard = catchAsync(async (req, res) => {
  const currentUserId = req.user?._id?.toString();
  const result = await examResultServices.getGlobalLeaderboard(
    currentUserId,
    req.validQuery,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Global leaderboard retrieved successfully!",
    data: {
      period: result.period,
      myGlobalPosition: result.myGlobalPosition,
      leaderboard: result.leaderboard,
    },
    meta: result.meta,
  });
});

// 7. CALCULATE & ASSIGN LIVE EXAM RANKS (Admin)
const calculateAndAssignLiveExamRanks = catchAsync(async (req, res) => {
  const result = await examResultServices.calculateAndAssignLiveExamRanks(
    req.params.examId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Live exam candidate ranks calculated and assigned successfully!",
    data: result,
  });
});

export const examResultControllers = {
  getMyResults,
  getAllExamResults,
  getResultById,
  getResultByAttemptId,
  getExamLeaderboard,
  getGlobalLeaderboard,
  calculateAndAssignLiveExamRanks,
};

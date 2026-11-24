import httpStatus from "http-status";
import { examAttemptServices } from "./exam-attempt.services";
import { sendResponse, catchAsync } from "../../utils";

// 1. START OFFICIAL EXAM
const startOfficialExam = catchAsync(async (req, res) => {
  const clientMeta = {
    ipAddress:
      ((req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()) ||
      req.ip ||
      null,
    userAgent: req.headers["user-agent"] || null,
  };

  const result = await examAttemptServices.startOfficialExam(
    req.user._id.toString(),
    req.params.examId as string,
    clientMeta,
  );

  sendResponse(res, {
    statusCode: result.isResumed ? httpStatus.OK : httpStatus.CREATED,
    message: result.isResumed
      ? "Ongoing exam session resumed successfully!"
      : "Exam started successfully!",
    data: result,
  });
});

// 2. START SELF PRACTICE EXAM
const startSelfPracticeExam = catchAsync(async (req, res) => {
  const clientMeta = {
    ipAddress:
      ((req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()) ||
      req.ip ||
      null,
    userAgent: req.headers["user-agent"] || null,
  };

  const result = await examAttemptServices.startSelfPracticeExam(
    req.user._id.toString(),
    req.body,
    clientMeta,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "Self practice quiz started successfully!",
    data: result,
  });
});

// 3. RESUME ACTIVE ATTEMPT
const resumeActiveAttempt = catchAsync(async (req, res) => {
  const result = await examAttemptServices.resumeActiveAttempt(
    req.user._id.toString(),
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Active attempt resumed successfully!",
    data: result,
  });
});

// 4. SYNC ANSWER
const syncAnswer = catchAsync(async (req, res) => {
  const result = await examAttemptServices.syncAnswer(
    req.user._id.toString(),
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Answer synced successfully!",
    data: result,
  });
});

// 5. LOG TAB SWITCH
const logTabSwitch = catchAsync(async (req, res) => {
  const result = await examAttemptServices.logTabSwitch(
    req.user._id.toString(),
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Tab switch logged successfully!",
    data: result,
  });
});

// 6. SUBMIT EXAM
const submitExam = catchAsync(async (req, res) => {
  const result = await examAttemptServices.submitExam(
    req.user._id.toString(),
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Exam submitted and graded successfully!",
    data: result,
  });
});

// 7. REVIEW ANSWER SCRIPT
const reviewAnswerScript = catchAsync(async (req, res) => {
  const isAdmin = req.user.role === "admin" || req.user.role === "super_admin";
  const result = await examAttemptServices.reviewAnswerScript(
    req.user._id.toString(),
    req.params.id as string,
    isAdmin,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Answer script retrieved successfully!",
    data: result,
  });
});

// 8. GET MY ATTEMPTS
const getMyAttempts = catchAsync(async (req, res) => {
  const result = await examAttemptServices.getMyAttempts(
    req.user._id.toString(),
    req.validQuery,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Your exam attempts retrieved successfully!",
    data: result.data,
    meta: result.meta,
  });
});

// 9. GET ALL EXAM ATTEMPTS (Admin)
const getAllExamAttempt = catchAsync(async (req, res) => {
  const result = await examAttemptServices.getAllExamAttempt(req.validQuery);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "All exam attempts retrieved successfully!",
    data: result.data,
    meta: result.meta,
  });
});

// 10. CANCEL ATTEMPT (Admin)
const cancelAttempt = catchAsync(async (req, res) => {
  const result = await examAttemptServices.cancelAttempt(
    req.params.id as string,
    req.body.reason,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Exam attempt cancelled successfully!",
    data: result,
  });
});

export const examAttemptControllers = {
  startOfficialExam,
  startSelfPracticeExam,
  resumeActiveAttempt,
  syncAnswer,
  logTabSwitch,
  submitExam,
  reviewAnswerScript,
  getMyAttempts,
  getAllExamAttempt,
  cancelAttempt,
};

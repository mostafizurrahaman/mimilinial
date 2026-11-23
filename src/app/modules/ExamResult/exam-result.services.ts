import httpStatus from "http-status";
import { Types } from "mongoose";
import type { PipelineStage } from "mongoose";
import {
  AppError,
  BadRequest,
  NotFoundError,
} from "../../errors";
import { ExamResult } from "./exam-result.model";
import { Exam } from "../Exam/exam.model";
import { EXAM_TYPE } from "../Exam/exam.constants";
import { examResultSortableFields } from "./exam-result.constants";
import { formatQuery } from "../../utils";
import { formatDisplayTime } from "./exam-result.utils";
import type {
  TGetMyResultsQueryParamsType,
  TGetAllExamResultsQueryParamsType,
  TGetExamLeaderboardQueryParamsType,
  TGetGlobalLeaderboardQueryParamsType,
} from "./exam-result.validations";

// 1. GET MY RESULTS
const getMyResults = async (
  userId: string,
  query: TGetMyResultsQueryParamsType,
) => {
  const {
    page,
    limit,
    skip,
    sortOrder,
    sortBy,
    fromDate,
    toDate,
  } = formatQuery(query, examResultSortableFields);

  const matchFilter: Record<string, any> = {
    user: new Types.ObjectId(userId),
  };

  if (typeof query.isPassed === "boolean") {
    matchFilter.isPassed = query.isPassed;
  }
  if (typeof query.isSelfPractice === "boolean") {
    matchFilter.isSelfPractice = query.isSelfPractice;
  }
  if (query.examId) {
    matchFilter.examId = new Types.ObjectId(query.examId);
  }

  const pipeline: PipelineStage[] = [];

  // Match filters
  if (Object.keys(matchFilter).length > 0) {
    pipeline.push({ $match: matchFilter });
  }

  if (fromDate || toDate) {
    const dateFilter: Record<string, any> = {};
    if (fromDate) dateFilter.$gte = new Date(fromDate);
    if (toDate) dateFilter.$lte = new Date(toDate);
    pipeline.push({ $match: { createdAt: dateFilter } });
  }

  // Lookup Exam details
  pipeline.push(
    {
      $lookup: {
        from: "exams",
        localField: "examId",
        foreignField: "_id",
        as: "examDetails",
        pipeline: [
          {
            $project: {
              title: 1,
              slug: 1,
              examLevel: 1,
              examType: 1,
              durationMins: 1,
              totalMarks: 1,
              passMarks: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$examDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
  );

  // Clean Final Projection (Clear, readable and structured)
  pipeline.push({
    $project: {
      _id: 1,
      attemptId: 1,
      isSelfPractice: 1,
      exam: {
        $cond: {
          if: "$isSelfPractice",
          then: null,
          else: {
            _id: "$examDetails._id",
            title: "$examDetails.title",
            slug: "$examDetails.slug",
            examLevel: "$examDetails.examLevel",
            examType: "$examDetails.examType",
            durationMins: "$examDetails.durationMins",
            totalMarks: "$examDetails.totalMarks",
            passMarks: "$examDetails.passMarks",
          },
        },
      },
      scorecard: {
        totalQuestions: "$totalQuestions",
        totalAnswered: "$totalAnswered",
        totalSkipped: "$totalSkipped",
        correctCount: "$correctCount",
        wrongCount: "$wrongCount",
        obtainedMarks: "$obtainedMarks",
        deductedMarks: "$deductedMarks",
        finalScore: "$finalScore",
        percentage: "$percentage",
        isPassed: "$isPassed",
        rank: "$rank",
      },
      subjectBreakdown: "$subjectBreakdown",
      totalTimeTakenSeconds: "$totalTimeTakenSeconds",
      totalTimeTakenMinutes: "$totalTimeTakenMinutes",
      displayTotalTimeTaken: "$displayTotalTimeTaken",
      createdAt: "$createdAt",
      updatedAt: "$updatedAt",
    },
  });

  pipeline.push({ $sort: { [sortBy]: sortOrder } });

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: "total" }],
    },
  });

  const aggregated = await ExamResult.aggregate(pipeline);

  const data = aggregated?.[0]?.data || [];
  const total = aggregated?.[0]?.meta?.[0]?.total || 0;

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    data,
  };
};

// 2. GET ALL EXAM RESULTS (Admin)
const getAllExamResults = async (query: TGetAllExamResultsQueryParamsType) => {
  const {
    page,
    limit,
    skip,
    searchTerm,
    sortOrder,
    sortBy,
    fromDate,
    toDate,
  } = formatQuery(query, examResultSortableFields);

  const matchFilter: Record<string, any> = {};

  if (typeof query.isPassed === "boolean") {
    matchFilter.isPassed = query.isPassed;
  }
  if (typeof query.isSelfPractice === "boolean") {
    matchFilter.isSelfPractice = query.isSelfPractice;
  }
  if (query.examId) {
    matchFilter.examId = new Types.ObjectId(query.examId);
  }
  if (query.userId) {
    matchFilter.user = new Types.ObjectId(query.userId);
  }

  const pipeline: PipelineStage[] = [];

  if (Object.keys(matchFilter).length > 0) {
    pipeline.push({ $match: matchFilter });
  }

  if (fromDate || toDate) {
    const dateFilter: Record<string, any> = {};
    if (fromDate) dateFilter.$gte = new Date(fromDate);
    if (toDate) dateFilter.$lte = new Date(toDate);
    pipeline.push({ $match: { createdAt: dateFilter } });
  }

  // Lookup Exam
  pipeline.push(
    {
      $lookup: {
        from: "exams",
        localField: "examId",
        foreignField: "_id",
        as: "examDetails",
        pipeline: [
          {
            $project: {
              title: 1,
              slug: 1,
              examLevel: 1,
              examType: 1,
              durationMins: 1,
              totalMarks: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$examDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
  );

  // Lookup User
  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDetails",
        pipeline: [
          {
            $project: {
              name: 1,
              email: 1,
              phone: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$userDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
  );

  // Search term filter on exam title or student name
  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: [
          { "examDetails.title": { $regex: searchTerm, $options: "i" } },
          { "userDetails.name": { $regex: searchTerm, $options: "i" } },
          { "userDetails.email": { $regex: searchTerm, $options: "i" } },
        ],
      },
    });
  }

  // Clean structured projection
  pipeline.push({
    $project: {
      _id: 1,
      attemptId: 1,
      isSelfPractice: 1,
      exam: {
        $cond: {
          if: "$isSelfPractice",
          then: null,
          else: {
            _id: "$examDetails._id",
            title: "$examDetails.title",
            slug: "$examDetails.slug",
            examLevel: "$examDetails.examLevel",
            examType: "$examDetails.examType",
            durationMins: "$examDetails.durationMins",
            totalMarks: "$examDetails.totalMarks",
          },
        },
      },
      user: {
        _id: "$userDetails._id",
        name: "$userDetails.name",
        email: "$userDetails.email",
        phone: "$userDetails.phone",
        avatar: "$userDetails.avatar",
      },
      scorecard: {
        totalQuestions: "$totalQuestions",
        totalAnswered: "$totalAnswered",
        totalSkipped: "$totalSkipped",
        correctCount: "$correctCount",
        wrongCount: "$wrongCount",
        obtainedMarks: "$obtainedMarks",
        deductedMarks: "$deductedMarks",
        finalScore: "$finalScore",
        percentage: "$percentage",
        isPassed: "$isPassed",
        rank: "$rank",
      },
      subjectBreakdown: "$subjectBreakdown",
      totalTimeTakenSeconds: "$totalTimeTakenSeconds",
      totalTimeTakenMinutes: "$totalTimeTakenMinutes",
      displayTotalTimeTaken: "$displayTotalTimeTaken",
      createdAt: "$createdAt",
      updatedAt: "$updatedAt",
    },
  });

  pipeline.push({ $sort: { [sortBy]: sortOrder } });

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: "total" }],
    },
  });

  const aggregated = await ExamResult.aggregate(pipeline);

  const data = aggregated?.[0]?.data || [];
  const total = aggregated?.[0]?.meta?.[0]?.total || 0;

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    data,
  };
};

// 3. GET RESULT BY ID
const getResultById = async (
  userId: string,
  resultId: string,
  isAdmin: boolean = false,
) => {
  const result = await ExamResult.findById(resultId)
    .populate("examId", "title slug examLevel examType durationMins totalMarks passMarks")
    .populate("user", "name email avatar");

  if (!result) {
    throw new NotFoundError("Exam result not found.");
  }

  if (!isAdmin && result.user._id.toString() !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "Access denied to this result.");
  }

  return result;
};

// 4. GET RESULT BY ATTEMPT ID
const getResultByAttemptId = async (
  userId: string,
  attemptId: string,
  isAdmin: boolean = false,
) => {
  const result = await ExamResult.findOne({
    attemptId: new Types.ObjectId(attemptId),
  })
    .populate("examId", "title slug examLevel examType durationMins totalMarks passMarks")
    .populate("user", "name email avatar");

  if (!result) {
    throw new NotFoundError("Exam result not found for this attempt.");
  }

  if (!isAdmin && result.user._id.toString() !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, "Access denied to this result.");
  }

  return result;
};

// 5. GET EXAM LEADERBOARD (Top Candidates & Candidate Position)
const getExamLeaderboard = async (
  examId: string,
  currentUserId?: string,
  query?: TGetExamLeaderboardQueryParamsType,
) => {
  const page = Number(query?.page) || 1;
  const limit = Number(query?.limit) || 100;
  const skip = (page - 1) * limit;

  const exam = await Exam.findById(examId);
  if (!exam) {
    throw new NotFoundError("Exam not found.");
  }

  // Edge case: Live exam leaderboard hidden until exam end window
  if (exam.examType === EXAM_TYPE.LIVE && exam.endTime) {
    if (new Date() < new Date(exam.endTime)) {
      throw new BadRequest(
        `Leaderboard is hidden until the live exam closes at ${new Date(exam.endTime).toLocaleString()} to prevent unfair advantage.`,
      );
    }
  }

  const matchFilter = {
    examId: new Types.ObjectId(examId),
    isSelfPractice: false,
  };

  const pipeline: PipelineStage[] = [
    { $match: matchFilter },
    // Tie-breaking sort:
    // 1. finalScore (desc)
    // 2. wrongCount (asc - least wrong answers)
    // 3. totalTimeTakenSeconds (asc - fastest completion)
    // 4. createdAt (asc - earlier submission)
    {
      $sort: {
        finalScore: -1,
        wrongCount: 1,
        totalTimeTakenSeconds: 1,
        createdAt: 1,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDetails",
        pipeline: [
          {
            $project: {
              name: 1,
              avatar: 1,
              email: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$userDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        attemptId: 1,
        user: {
          _id: "$userDetails._id",
          name: "$userDetails.name",
          avatar: "$userDetails.avatar",
        },
        finalScore: "$finalScore",
        percentage: "$percentage",
        correctCount: "$correctCount",
        wrongCount: "$wrongCount",
        totalTimeTakenSeconds: "$totalTimeTakenSeconds",
        totalTimeTakenMinutes: "$totalTimeTakenMinutes",
        displayTotalTimeTaken: "$displayTotalTimeTaken",
        createdAt: "$createdAt",
      },
    },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        meta: [{ $count: "total" }],
      },
    },
  ];

  const aggregated = await ExamResult.aggregate(pipeline);

  const rawData = aggregated?.[0]?.data || [];
  const total = aggregated?.[0]?.meta?.[0]?.total || 0;

  // Assign sequential dynamic ranks for the current page
  const rankedData = rawData.map((item: any, index: number) => ({
    rank: skip + index + 1,
    ...item,
  }));

  // Find current user's position in leaderboard if user is logged in
  let myPosition: any = null;
  if (currentUserId) {
    const myResult = await ExamResult.findOne({
      examId: new Types.ObjectId(examId),
      user: new Types.ObjectId(currentUserId),
    }).sort({ finalScore: -1 });

    if (myResult) {
      // Calculate rank by counting how many students performed better
      const higherCount = await ExamResult.countDocuments({
        examId: new Types.ObjectId(examId),
        isSelfPractice: false,
        $or: [
          { finalScore: { $gt: myResult.finalScore } },
          {
            finalScore: myResult.finalScore,
            wrongCount: { $lt: myResult.wrongCount },
          },
          {
            finalScore: myResult.finalScore,
            wrongCount: myResult.wrongCount,
            totalTimeTakenSeconds: { $lt: myResult.totalTimeTakenSeconds },
          },
          {
            finalScore: myResult.finalScore,
            wrongCount: myResult.wrongCount,
            totalTimeTakenSeconds: myResult.totalTimeTakenSeconds,
            createdAt: { $lt: myResult.createdAt },
          },
        ],
      });

      myPosition = {
        rank: higherCount + 1,
        resultId: myResult._id,
        finalScore: myResult.finalScore,
        percentage: myResult.percentage,
        correctCount: myResult.correctCount,
        wrongCount: myResult.wrongCount,
        totalTimeTakenSeconds: myResult.totalTimeTakenSeconds,
        totalTimeTakenMinutes: myResult.totalTimeTakenMinutes,
        displayTotalTimeTaken: myResult.displayTotalTimeTaken,
      };
    }
  }

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    exam: {
      _id: exam._id,
      title: exam.title,
      slug: exam.slug,
      totalMarks: exam.totalMarks,
      durationMins: exam.durationMins,
    },
    myPosition,
    leaderboard: rankedData,
  };
};

// 6. BATCH UTILITY: Calculate and assign permanent ranks to live exam candidates
const calculateAndAssignLiveExamRanks = async (examId: string) => {
  const results = await ExamResult.find({
    examId: new Types.ObjectId(examId),
    isSelfPractice: false,
  }).sort({
    finalScore: -1,
    wrongCount: 1,
    totalTimeTakenSeconds: 1,
    createdAt: 1,
  });

  const bulkOps = results.map((res, index) => ({
    updateOne: {
      filter: { _id: res._id },
      update: { $set: { rank: index + 1 } },
    },
  }));

  if (bulkOps.length > 0) {
    await ExamResult.bulkWrite(bulkOps);
  }

  return { updatedCount: results.length };
};

// 7. GET GLOBAL LEADERBOARD (Overall Platform Ranking with Period and Collection Filters)
const getGlobalLeaderboard = async (
  currentUserId?: string,
  query?: TGetGlobalLeaderboardQueryParamsType,
) => {
  const page = Number(query?.page) || 1;
  const limit = Number(query?.limit) || 50;
  const skip = (page - 1) * limit;

  const matchFilter: Record<string, any> = {
    isSelfPractice: false,
  };

  // Period filtering: all_time, monthly, weekly
  const now = new Date();
  if (query?.period === "weekly") {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    matchFilter.createdAt = { $gte: startOfWeek };
  } else if (query?.period === "monthly") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    matchFilter.createdAt = { $gte: startOfMonth };
  }

  const pipeline: PipelineStage[] = [{ $match: matchFilter }];

  // Optional collection-based filtering
  if (query?.collectionId) {
    pipeline.push(
      {
        $lookup: {
          from: "exams",
          localField: "examId",
          foreignField: "_id",
          as: "examDoc",
          pipeline: [
            {
              $lookup: {
                from: "categories",
                localField: "category",
                foreignField: "_id",
                as: "catDoc",
                pipeline: [{ $project: { coll: 1 } }],
              },
            },
            { $unwind: { path: "$catDoc", preserveNullAndEmptyArrays: true } },
            { $project: { collectionId: "$catDoc.coll" } },
          ],
        },
      },
      { $unwind: { path: "$examDoc", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          "examDoc.collectionId": new Types.ObjectId(query.collectionId),
        },
      },
    );
  }

  // Aggregate user statistics
  pipeline.push(
    {
      $group: {
        _id: "$user",
        totalScore: { $sum: "$finalScore" },
        totalExamsAttended: { $sum: 1 },
        avgPercentage: { $avg: "$percentage" },
        totalCorrect: { $sum: "$correctCount" },
        totalTimeSpentSeconds: { $sum: "$totalTimeTakenSeconds" },
      },
    },
    {
      $sort: {
        totalScore: -1,
        avgPercentage: -1,
        totalCorrect: -1,
        totalTimeSpentSeconds: 1,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "userDetails",
        pipeline: [
          {
            $project: {
              name: 1,
              avatar: 1,
              email: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$userDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        user: {
          _id: "$userDetails._id",
          name: "$userDetails.name",
          avatar: "$userDetails.avatar",
        },
        totalScore: { $round: ["$totalScore", 2] },
        totalExamsAttended: 1,
        avgPercentage: { $round: ["$avgPercentage", 2] },
        totalCorrect: 1,
        totalTimeSpentSeconds: 1,
      },
    },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        meta: [{ $count: "total" }],
      },
    },
  );

  const aggregated = await ExamResult.aggregate(pipeline);

  const rawData = aggregated?.[0]?.data || [];
  const total = aggregated?.[0]?.meta?.[0]?.total || 0;

  const rankedData = rawData.map((item: any, index: number) => ({
    rank: skip + index + 1,
    ...item,
    displayTotalTimeSpent: formatDisplayTime(item.totalTimeSpentSeconds),
  }));

  // Calculate current user's global position if logged in
  let myGlobalPosition: any = null;
  if (currentUserId) {
    const userStats = await ExamResult.aggregate([
      {
        $match: {
          ...matchFilter,
          user: new Types.ObjectId(currentUserId),
        },
      },
      {
        $group: {
          _id: "$user",
          totalScore: { $sum: "$finalScore" },
          totalExamsAttended: { $sum: 1 },
          avgPercentage: { $avg: "$percentage" },
          totalCorrect: { $sum: "$correctCount" },
          totalTimeSpentSeconds: { $sum: "$totalTimeTakenSeconds" },
        },
      },
    ]);

    if (userStats.length > 0) {
      const myStats = userStats[0];

      // Count how many users have higher totalScore
      const higherUsers = await ExamResult.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: "$user",
            totalScore: { $sum: "$finalScore" },
            avgPercentage: { $avg: "$percentage" },
          },
        },
        {
          $match: {
            $or: [
              { totalScore: { $gt: myStats.totalScore } },
              {
                totalScore: myStats.totalScore,
                avgPercentage: { $gt: myStats.avgPercentage },
              },
            ],
          },
        },
        { $count: "higherCount" },
      ]);

      const rank = (higherUsers?.[0]?.higherCount || 0) + 1;

      myGlobalPosition = {
        rank,
        totalScore: Math.round(myStats.totalScore * 100) / 100,
        totalExamsAttended: myStats.totalExamsAttended,
        avgPercentage: Math.round(myStats.avgPercentage * 100) / 100,
        totalCorrect: myStats.totalCorrect,
        totalTimeSpentSeconds: myStats.totalTimeSpentSeconds,
        displayTotalTimeSpent: formatDisplayTime(myStats.totalTimeSpentSeconds),
      };
    }
  }

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    period: query?.period || "all_time",
    myGlobalPosition,
    leaderboard: rankedData,
  };
};

export const examResultServices = {
  getMyResults,
  getAllExamResults,
  getResultById,
  getResultByAttemptId,
  getExamLeaderboard,
  getGlobalLeaderboard,
  calculateAndAssignLiveExamRanks,
};

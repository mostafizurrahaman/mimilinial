import { Types } from "mongoose";
import type { PipelineStage } from "mongoose";
import { UserMastery } from "./user-mastery.model";
import {
  MASTERY_LEVEL,
  userMasterySortableFields,
  type TMasteryLevel,
} from "./user-mastery.constants";
import { ExamAttemptUtils } from "../ExamAttempt/exam-attempt.utils";
import type { IExamAttemptDoc } from "../ExamAttempt/exam-attempt.interfaces";
import type {
  TGetWeakTopicsQueryParamsType,
  TGetStrongTopicsQueryParamsType,
  TGetSubjectMasteryParamsType,
} from "./user-mastery.validations";

/**
 * -------------------------------------------------------------------------
 * 1. ASYNC WORKER: Update User Mastery from Evaluated Attempt
 * Invoked automatically upon exam submission / grading.
 * -------------------------------------------------------------------------
 */
const updateMasteryFromExamAttempt = async (
  attempt: IExamAttemptDoc,
  versionsMap: Map<string, any>,
  mappingsMap: Map<string, any>,
) => {
  const userObjectId = new Types.ObjectId(attempt.user);

  // Group question evaluation by topic
  const topicStatsMap = new Map<
    string,
    {
      topicId: Types.ObjectId;
      subjectId: Types.ObjectId;
      attemptedCount: number;
      correctCount: number;
      wrongCount: number;
    }
  >();

  for (const item of attempt.questions) {
    if (!item.isAnswered) continue; // Skip skipped questions

    const mapping = item.mappingId
      ? mappingsMap.get(item.mappingId.toString())
      : null;

    if (!mapping || !mapping.topic || !mapping.subject) continue;

    const topicId = mapping.topic._id || mapping.topic;
    const subjectId = mapping.subject._id || mapping.subject;
    const topicKey = topicId.toString();

    if (!topicStatsMap.has(topicKey)) {
      topicStatsMap.set(topicKey, {
        topicId: new Types.ObjectId(topicId),
        subjectId: new Types.ObjectId(subjectId),
        attemptedCount: 0,
        correctCount: 0,
        wrongCount: 0,
      });
    }

    const stats = topicStatsMap.get(topicKey)!;
    stats.attemptedCount += 1;

    const version = item.versionId
      ? versionsMap.get(item.versionId.toString())
      : null;

    if (version) {
      const evalResult = ExamAttemptUtils.evaluateAnswer(
        item.questionType as any,
        version,
        item.userAnswer,
      );

      if (evalResult.isCorrect) {
        stats.correctCount += 1;
      } else {
        stats.wrongCount += 1;
      }
    } else {
      stats.wrongCount += 1;
    }
  }

  // Update or insert each topic mastery record
  const now = new Date();
  for (const stats of topicStatsMap.values()) {
    try {
      const existing = await UserMastery.findOne({
        user: userObjectId,
        topic: stats.topicId,
      });

      if (existing) {
        existing.totalQuestionsAttempted += stats.attemptedCount;
        existing.totalCorrect += stats.correctCount;
        existing.totalWrong += stats.wrongCount;
        existing.lastAttemptedAt = now;
        await existing.save(); // Triggers pre-save hook for accuracy & level
      } else {
        const accuracy =
          stats.attemptedCount > 0
            ? Math.round(
                (stats.correctCount / stats.attemptedCount) * 10000,
              ) / 100
            : 0;

        let level: TMasteryLevel = MASTERY_LEVEL.AVERAGE;
        if (accuracy < 60) level = MASTERY_LEVEL.WEAK;
        else if (accuracy < 75) level = MASTERY_LEVEL.AVERAGE;
        else if (accuracy < 90) level = MASTERY_LEVEL.STRONG;
        else level = MASTERY_LEVEL.MASTERED;

        await UserMastery.create({
          user: userObjectId,
          topic: stats.topicId,
          subject: stats.subjectId,
          totalQuestionsAttempted: stats.attemptedCount,
          totalCorrect: stats.correctCount,
          totalWrong: stats.wrongCount,
          accuracyPercentage: accuracy,
          masteryLevel: level,
          lastAttemptedAt: now,
        });
      }
    } catch (err) {
      console.error(
        `Failed to update mastery for topic ${stats.topicId}:`,
        err,
      );
    }
  }
};

/**
 * -------------------------------------------------------------------------
 * 2. GET WEAK TOPICS (Topics with Accuracy < 60%)
 * -------------------------------------------------------------------------
 */
const getWeakTopics = async (
  userId: string,
  query: TGetWeakTopicsQueryParamsType,
) => {
  const limit = Number(query.limit) || 10;
  const minAttempts = Number(query.minAttempts) || 2;

  const matchFilter: Record<string, any> = {
    user: new Types.ObjectId(userId),
    masteryLevel: MASTERY_LEVEL.WEAK,
    totalQuestionsAttempted: { $gte: minAttempts },
  };

  if (query.subjectId) {
    matchFilter.subject = new Types.ObjectId(query.subjectId);
  }

  const pipeline: PipelineStage[] = [
    { $match: matchFilter },
    {
      $sort: {
        accuracyPercentage: 1, // Lowest accuracy first
        totalQuestionsAttempted: -1,
      },
    },
    { $limit: limit },
    {
      $lookup: {
        from: "topics",
        localField: "topic",
        foreignField: "_id",
        as: "topicDetails",
        pipeline: [{ $project: { name: 1, slug: 1 } }],
      },
    },
    { $unwind: "$topicDetails" },
    {
      $lookup: {
        from: "subjects",
        localField: "subject",
        foreignField: "_id",
        as: "subjectDetails",
        pipeline: [{ $project: { name: 1, slug: 1 } }],
      },
    },
    { $unwind: "$subjectDetails" },
    {
      $project: {
        _id: 1,
        topic: {
          _id: "$topicDetails._id",
          name: "$topicDetails.name",
          slug: "$topicDetails.slug",
        },
        subject: {
          _id: "$subjectDetails._id",
          name: "$subjectDetails.name",
          slug: "$subjectDetails.slug",
        },
        accuracyPercentage: "$accuracyPercentage",
        masteryLevel: "$masteryLevel",
        totalQuestionsAttempted: "$totalQuestionsAttempted",
        totalCorrect: "$totalCorrect",
        totalWrong: "$totalWrong",
        lastAttemptedAt: "$lastAttemptedAt",
        recommendation: {
          $concat: [
            "Your accuracy in '",
            "$topicDetails.name",
            "' is ",
            { $toString: "$accuracyPercentage" },
            "%. Additional practice is recommended.",
          ],
        },
      },
    },
  ];

  const weakTopics = await UserMastery.aggregate(pipeline);

  return {
    totalWeakTopics: weakTopics.length,
    data: weakTopics,
  };
};

/**
 * -------------------------------------------------------------------------
 * 3. GET STRONG TOPICS (Topics with Accuracy >= 75%)
 * -------------------------------------------------------------------------
 */
const getStrongTopics = async (
  userId: string,
  query: TGetStrongTopicsQueryParamsType,
) => {
  const limit = Number(query.limit) || 10;

  const matchFilter: Record<string, any> = {
    user: new Types.ObjectId(userId),
    masteryLevel: { $in: [MASTERY_LEVEL.STRONG, MASTERY_LEVEL.MASTERED] },
  };

  if (query.subjectId) {
    matchFilter.subject = new Types.ObjectId(query.subjectId);
  }

  const pipeline: PipelineStage[] = [
    { $match: matchFilter },
    {
      $sort: {
        accuracyPercentage: -1, // Highest accuracy first
        totalQuestionsAttempted: -1,
      },
    },
    { $limit: limit },
    {
      $lookup: {
        from: "topics",
        localField: "topic",
        foreignField: "_id",
        as: "topicDetails",
        pipeline: [{ $project: { name: 1, slug: 1 } }],
      },
    },
    { $unwind: "$topicDetails" },
    {
      $lookup: {
        from: "subjects",
        localField: "subject",
        foreignField: "_id",
        as: "subjectDetails",
        pipeline: [{ $project: { name: 1, slug: 1 } }],
      },
    },
    { $unwind: "$subjectDetails" },
    {
      $project: {
        _id: 1,
        topic: {
          _id: "$topicDetails._id",
          name: "$topicDetails.name",
          slug: "$topicDetails.slug",
        },
        subject: {
          _id: "$subjectDetails._id",
          name: "$subjectDetails.name",
          slug: "$subjectDetails.slug",
        },
        accuracyPercentage: "$accuracyPercentage",
        masteryLevel: "$masteryLevel",
        totalQuestionsAttempted: "$totalQuestionsAttempted",
        totalCorrect: "$totalCorrect",
        totalWrong: "$totalWrong",
        lastAttemptedAt: "$lastAttemptedAt",
        recommendation: {
          $concat: [
            "Excellent performance in '",
            "$topicDetails.name",
            "' with ",
            { $toString: "$accuracyPercentage" },
            "% accuracy!",
          ],
        },
      },
    },
  ];

  const strongTopics = await UserMastery.aggregate(pipeline);

  return {
    totalStrongTopics: strongTopics.length,
    data: strongTopics,
  };
};

/**
 * -------------------------------------------------------------------------
 * 4. GET OVERALL MASTERY DASHBOARD
 * -------------------------------------------------------------------------
 */
const getMasteryOverview = async (userId: string) => {
  const userObjectId = new Types.ObjectId(userId);

  // Overall aggregate metrics
  const overallStats = await UserMastery.aggregate([
    { $match: { user: userObjectId } },
    {
      $group: {
        _id: null,
        totalTopicsPracticed: { $sum: 1 },
        totalQuestionsAttempted: { $sum: "$totalQuestionsAttempted" },
        totalCorrect: { $sum: "$totalCorrect" },
        totalWrong: { $sum: "$totalWrong" },
        weakCount: {
          $sum: { $cond: [{ $eq: ["$masteryLevel", MASTERY_LEVEL.WEAK] }, 1, 0] },
        },
        averageCount: {
          $sum: {
            $cond: [{ $eq: ["$masteryLevel", MASTERY_LEVEL.AVERAGE] }, 1, 0],
          },
        },
        strongCount: {
          $sum: {
            $cond: [{ $eq: ["$masteryLevel", MASTERY_LEVEL.STRONG] }, 1, 0],
          },
        },
        masteredCount: {
          $sum: {
            $cond: [{ $eq: ["$masteryLevel", MASTERY_LEVEL.MASTERED] }, 1, 0],
          },
        },
      },
    },
  ]);

  const stats = overallStats?.[0] || {
    totalTopicsPracticed: 0,
    totalQuestionsAttempted: 0,
    totalCorrect: 0,
    totalWrong: 0,
    weakCount: 0,
    averageCount: 0,
    strongCount: 0,
    masteredCount: 0,
  };

  const overallAccuracy =
    stats.totalQuestionsAttempted > 0
      ? Math.round((stats.totalCorrect / stats.totalQuestionsAttempted) * 10000) /
        100
      : 0;

  // Subject-wise mastery breakdown
  const subjectBreakdown = await UserMastery.aggregate([
    { $match: { user: userObjectId } },
    {
      $group: {
        _id: "$subject",
        topicsPracticed: { $sum: 1 },
        totalQuestions: { $sum: "$totalQuestionsAttempted" },
        totalCorrect: { $sum: "$totalCorrect" },
        weakTopicsCount: {
          $sum: { $cond: [{ $eq: ["$masteryLevel", MASTERY_LEVEL.WEAK] }, 1, 0] },
        },
        strongTopicsCount: {
          $sum: {
            $cond: [
              {
                $in: [
                  "$masteryLevel",
                  [MASTERY_LEVEL.STRONG, MASTERY_LEVEL.MASTERED],
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: "subjects",
        localField: "_id",
        foreignField: "_id",
        as: "subjectDetails",
        pipeline: [{ $project: { name: 1, slug: 1 } }],
      },
    },
    { $unwind: "$subjectDetails" },
    {
      $project: {
        _id: "$subjectDetails._id",
        name: "$subjectDetails.name",
        slug: "$subjectDetails.slug",
        topicsPracticed: "$topicsPracticed",
        totalQuestions: "$totalQuestions",
        accuracyPercentage: {
          $cond: [
            { $gt: ["$totalQuestions", 0] },
            {
              $round: [
                {
                  $multiply: [
                    { $divide: ["$totalCorrect", "$totalQuestions"] },
                    100,
                  ],
                },
                2,
              ],
            },
            0,
          ],
        },
        weakTopicsCount: "$weakTopicsCount",
        strongTopicsCount: "$strongTopicsCount",
      },
    },
    { $sort: { accuracyPercentage: 1 } },
  ]);

  return {
    overview: {
      totalTopicsPracticed: stats.totalTopicsPracticed,
      totalQuestionsAttempted: stats.totalQuestionsAttempted,
      totalCorrect: stats.totalCorrect,
      totalWrong: stats.totalWrong,
      overallAccuracyPercentage: overallAccuracy,
      masteryDistribution: {
        weak: stats.weakCount,
        average: stats.averageCount,
        strong: stats.strongCount,
        mastered: stats.masteredCount,
      },
    },
    subjectBreakdown,
  };
};

/**
 * -------------------------------------------------------------------------
 * 5. GET SUBJECT-SPECIFIC MASTERY DETAILS
 * -------------------------------------------------------------------------
 */
const getSubjectMasteryDetails = async (
  userId: string,
  subjectId: string,
) => {
  const userObjectId = new Types.ObjectId(userId);
  const subjectObjectId = new Types.ObjectId(subjectId);

  const pipeline: PipelineStage[] = [
    {
      $match: {
        user: userObjectId,
        subject: subjectObjectId,
      },
    },
    {
      $lookup: {
        from: "topics",
        localField: "topic",
        foreignField: "_id",
        as: "topicDetails",
        pipeline: [{ $project: { name: 1, slug: 1 } }],
      },
    },
    { $unwind: "$topicDetails" },
    {
      $lookup: {
        from: "subjects",
        localField: "subject",
        foreignField: "_id",
        as: "subjectDetails",
        pipeline: [{ $project: { name: 1, slug: 1 } }],
      },
    },
    { $unwind: "$subjectDetails" },
    {
      $project: {
        _id: 1,
        topic: {
          _id: "$topicDetails._id",
          name: "$topicDetails.name",
          slug: "$topicDetails.slug",
        },
        accuracyPercentage: "$accuracyPercentage",
        masteryLevel: "$masteryLevel",
        totalQuestionsAttempted: "$totalQuestionsAttempted",
        totalCorrect: "$totalCorrect",
        totalWrong: "$totalWrong",
        lastAttemptedAt: "$lastAttemptedAt",
      },
    },
    { $sort: { accuracyPercentage: 1 } },
  ];

  const topics = await UserMastery.aggregate(pipeline);

  return {
    subjectId,
    totalTopicsPracticed: topics.length,
    topics,
  };
};

export const userMasteryServices = {
  updateMasteryFromExamAttempt,
  getWeakTopics,
  getStrongTopics,
  getMasteryOverview,
  getSubjectMasteryDetails,
};

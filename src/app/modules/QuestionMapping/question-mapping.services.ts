import httpStatus from "http-status";
import type { PipelineStage } from "mongoose";
import type {
  TCreateQuestionMappingPayloadType,
  TUpdateQuestionMappingPayloadType,
  TGetAllQuestionMappingQueryParamsType,
} from "./question-mapping.validations";
import {
  AppError,
  BadRequest,
  ConflictError,
  NotFoundError,
} from "../../errors";
import { QuestionMapping } from "./question-mapping.model";
import { questionMappingSearchableFields } from "./question-mapping.constants";
import type { IUserDoc } from "../User";
import { Question, QUESTION_STATUS } from "../Questions";
import { Collection, COLLECTION_STATUS } from "../Collection";
import { Category, categoryStatus } from "../Category";
import { Subject, SUBJECT_STATUS } from "../Subject";
import { Topic, TOPIC_STATUS } from "../Topic";
import { Track, trackStatus } from "../Track";
import { EXAM_STATUS, PastExam } from "../PastExam";
import { QuestionVersion } from "../QuestionVersion";
import mongoose from "mongoose";

// 1. CREATE QUESTION MAPPING
const createQuestionMapping = async (
  user: IUserDoc,
  payload: TCreateQuestionMappingPayloadType,
) => {
  // Question mapping Docs:
  const {
    question,
    coll,
    category,
    track,
    subject,
    topic,
    pastExam,
    year,
    marks,
    sortOrder,
  } = payload;

  const [
    existingQuestion,
    questionVersion,
    existingCollection,
    existingCategory,
    existingSubject,
    existingTopic,
  ] = await Promise.all([
    Question.findById(question),
    QuestionVersion.findOne({
      question,
      isCurrent: true,
    }),
    Collection.findById(coll),
    Category.findById(category),
    Subject.findById(subject),
    Topic.findById(topic),
  ]);

  // Question related validation:
  if (!existingQuestion) {
    throw new NotFoundError("Question not found.");
  }

  if (existingQuestion.status !== QUESTION_STATUS.PUBLISHED) {
    throw new BadRequest(
      `You can not map an unpublished question. Current status "${existingQuestion.status}"`,
    );
  }

  //  Question Version:

  if (!questionVersion) {
    throw new NotFoundError("There is no current version of the question.");
  }

  // Collection related validation:
  if (!existingCollection) {
    throw new NotFoundError("Collection not found.");
  }

  if (existingCollection.status !== COLLECTION_STATUS.PUBLISHED) {
    throw new BadRequest(
      `You can not map ${existingCollection.status} collection.`,
    );
  }

  // Category Collection
  if (!existingCategory) {
    throw new NotFoundError("Category not found.");
  }

  if (existingCategory.status !== categoryStatus.PUBLISHED) {
    throw new BadRequest(
      `You can not map an unpublish category. Current status  "${existingCategory.status}"`,
    );
  }

  if (
    existingCategory.collectionId?.toString() !==
    existingCollection?._id?.toString()
  ) {
    throw new BadRequest(
      `The selected category does not belong to selected collection.`,
    );
  }

  // Checking tracks:
  let existingTrack = null;
  if (track) {
    existingTrack = await Track.findById(track);
    if (!existingTrack) {
      throw new NotFoundError("Track not found.");
    }

    if (existingTrack.status !== trackStatus.PUBLISHED) {
      throw new BadRequest(
        `You can not map an unpublished track. Current status  "${existingTrack?.status}"`,
      );
    }

    if (
      existingTrack.category?.toString() !== existingCategory?._id?.toString()
    ) {
      throw new BadRequest(
        `The selected track does not belong to the selected category.`,
      );
    }
  }

  // Passage ID:
  let existingPastExam = null;
  let correctedYear = year || null;
  if (pastExam) {
    existingPastExam = await PastExam.findById(pastExam);

    if (!existingPastExam) {
      throw new NotFoundError("Past exam not found.");
    }

    if (existingPastExam.status !== EXAM_STATUS.PUBLISHED) {
      throw new BadRequest(
        `You can not map an unpublished past exam. Current status ${existingPastExam.status} `,
      );
    }

    if (
      existingPastExam.category?.toString() !==
      existingCategory?._id?.toString()
    ) {
      throw new BadRequest(
        "The selected past exam does not belong to the selected  category.",
      );
    }

    //  Match past exam track:
    const pastExamTrackStr = existingPastExam.track
      ? existingPastExam.track.toString()
      : null;

    const selectedTrackStr = existingTrack
      ? existingTrack._id.toString()
      : null;

    if (pastExamTrackStr !== selectedTrackStr) {
      throw new BadRequest(
        "The selected past exam does not belong to the selected  track.",
      );
    }

    //  Question capacity check:
    const totalQuestions = existingPastExam?.totalQuestions || 0;
    const mappedQuestions = existingPastExam?.mappedQuestions ?? 0;

    if (mappedQuestions + 1 > totalQuestions) {
      throw new BadRequest(
        `You can not mapped more than ${totalQuestions} questions.`,
      );
    }

    correctedYear = existingPastExam.year;
  }

  // Subject Validation:
  if (!existingSubject) {
    throw new NotFoundError("Subject not found.");
  }

  if (existingSubject.status !== SUBJECT_STATUS.PUBLISHED) {
    throw new BadRequest(
      `You can not map an unpublished subject. Current status "${existingSubject.status}"`,
    );
  }

  // Subject Validation:
  if (!existingTopic) {
    throw new NotFoundError("Topic not found.");
  }

  if (existingTopic.status !== TOPIC_STATUS.PUBLISHED) {
    throw new BadRequest(
      `You can not map an unpublished topic. Current status "${existingTopic.status}"`,
    );
  }

  if (existingTopic.subject?.toString() !== existingSubject?._id?.toString()) {
    throw new BadRequest(
      `The selected topic does not belong to the selected subject.`,
    );
  }

  //   Check duplicate mapping:
  const isDuplicate = await QuestionMapping.exists({
    question: existingQuestion?._id,
    category: existingCategory?._id,
    track: existingTrack?._id ?? null,
    subject: existingSubject?._id,
    topic: existingTopic?._id,
    pastExam: existingPastExam?._id ?? null,
  });

  if (isDuplicate) {
    throw new ConflictError(
      `This question is already mapped to this topic and examination context.`,
    );
  }

  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    const [mappedQuestion] = await QuestionMapping.create(
      [
        {
          question: existingQuestion._id,

          // Classification Hierarchy:
          coll: existingCollection._id,
          category: existingCategory._id,
          track: existingTrack?._id || null,

          // Category:
          subject: existingSubject._id,
          topic: existingTopic._id,

          //  Previous Questions:
          pastExam: existingPastExam?._id || null,
          year: correctedYear,

          //  Marking and Order:
          marks,
          sortOrder,

          //  Author:
          author: user?._id,
        },
      ],
      {
        session: mongoSession,
      },
    );

    if (!mappedQuestion) {
      throw new BadRequest("Failed to mapped question");
    }

    if (mappedQuestion?.pastExam) {
      const updatedExam = await PastExam.findOneAndUpdate(
        {
          _id: mappedQuestion?.pastExam,
          $expr: { $lt: ["$mappedQuestions", "$totalQuestions"] },
        },
        {
          $inc: {
            mappedQuestions: 1,
          },
        },
        {
          session: mongoSession,
          new: true,
        },
      );

      if (!updatedExam) {
        throw new BadRequest(
          `Failed to update mapped count. The exam has already reached its total question limit.`,
        );
      }
    }

    await mongoSession.commitTransaction();

    return mappedQuestion;
  } catch (error) {
    if (mongoSession.inTransaction()) {
      await mongoSession.abortTransaction();
    }

    throw error;
  } finally {
    await mongoSession.endSession();
  }
};

// 2. UPDATE QUESTION MAPPING
const updateQuestionMapping = async (
  id: string,
  payload: TUpdateQuestionMappingPayloadType,
) => {
  const result = await QuestionMapping.findOneAndUpdate(
    { _id: id },
    { $set: payload },
    { new: true },
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "QuestionMapping not found");
  }

  return result;
};

// 3. GET ALL QUESTION MAPPING
const getAllQuestionMapping = async (
  query: TGetAllQuestionMappingQueryParamsType,
) => {
  const { page, limit, skip, searchTerm, sortOrder, sortBy, fromDate, toDate } =
    formatQuery(query, questionMappingSortableFields);

  const pipeline: PipelineStage[] = [];

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {};
    if (fromDate) dateFilter.$gte = new Date(fromDate);
    if (toDate) dateFilter.$lte = new Date(toDate);

    pipeline.push({ $match: { createdAt: dateFilter } });
  }

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: questionMappingSearchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: "i" },
        })),
      },
    });
  }

  pipeline.push({ $sort: { [sortBy]: sortOrder } });

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: "total" }],
    },
  });

  const aggregated = await QuestionMapping.aggregate(pipeline);

  const data = aggregated?.[0]?.data || [];
  const total = aggregated?.[0]?.meta?.[0]?.total || 0;

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

// 4. GET QUESTION MAPPING BY ID
const getQuestionMappingById = async (id: string) => {
  const result = await QuestionMapping.findById(id);

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "QuestionMapping not found");
  }

  return result;
};

// 5. DELETE QUESTION MAPPING BY ID
const deleteQuestionMappingById = async (id: string) => {
  const result = await QuestionMapping.findOneAndDelete({ _id: id });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "QuestionMapping not found");
  }

  return result;
};

export const questionMappingServices = {
  createQuestionMapping,
  updateQuestionMapping,
  getAllQuestionMapping,
  getQuestionMappingById,
  deleteQuestionMappingById,
};

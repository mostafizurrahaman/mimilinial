import httpStatus from "http-status";
import mongoose, { type PipelineStage, Types } from "mongoose";
import type {
  TCreateExamPayloadType,
  TUpdateExamPayloadType,
  TGetAllExamQueryParamsType,
} from "./exam.validations";
import {
  AppError,
  BadRequest,
  ConflictError,
  NotFoundError,
} from "../../errors";
import { Exam, CategoryExam, SubjectExam, TopicExam } from "./exam.model";
import {
  examSearchableFields,
  examSortableFields,
  EXAM_LEVEL,
  EXAM_STATUS,
  EXAM_TYPE,
  GENERATION_MODE,
} from "./exam.constants";
import { Category, categoryStatus } from "../Category";
import { Track, trackStatus } from "../Track";
import { Subject, SUBJECT_STATUS } from "../Subject";
import { Topic, TOPIC_STATUS } from "../Topic";
import { QuestionMapping } from "../QuestionMapping";
import type { IUserDoc } from "../User";
import { formatQuery, generateSlug } from "@/app/utils";

// Helper: Ensure unique slug
const generateUniqueSlug = async (title: string, baseSlug?: string | null) => {
  const initialSlug = baseSlug || generateSlug(title);
  let slug = initialSlug;
  let counter = 1;

  while (await Exam.exists({ slug })) {
    slug = `${initialSlug}-${counter}`;
    counter++;
  }

  return slug;
};

// 1. CREATE EXAM
const createExam = async (user: IUserDoc, payload: TCreateExamPayloadType) => {
  const {
    title,
    slug: providedSlug,
    description,
    examLevel,
    category,
    track,
    subject,
    topics,
    generationMode,
    durationMins,
    totalQuestions,
    marksPerQuestion,
    negativeMarks,
    passMarks,
    questionMappings = [],
    isRandomized,
    isOptionShuffled,
    isSpeedTest,
    examType,
    startTime,
    endTime,
    status = EXAM_STATUS.DRAFT,
  } = payload;

  // 1.1 Compute Total Marks
  const totalMarks =
    Math.round(totalQuestions * marksPerQuestion * 100) / 100;

  // 1.2 Generate Unique Slug
  const uniqueSlug = await generateUniqueSlug(title, providedSlug);

  // 1.3 Validate Hierarchy Integrity
  let categoryDoc = null;
  if (category) {
    categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      throw new NotFoundError("Selected category not found.");
    }
    if (categoryDoc.status !== categoryStatus.PUBLISHED) {
      throw new BadRequest(
        `Cannot create exam under an unpublished category (${categoryDoc.status}).`,
      );
    }
  }

  let trackDoc = null;
  if (track) {
    trackDoc = await Track.findById(track);
    if (!trackDoc) {
      throw new NotFoundError("Selected track not found.");
    }
    if (trackDoc.status !== trackStatus.PUBLISHED) {
      throw new BadRequest(
        `Cannot create exam under an unpublished track (${trackDoc.status}).`,
      );
    }
    if (
      !category ||
      trackDoc.category.toString() !== categoryDoc?._id.toString()
    ) {
      throw new BadRequest(
        "The selected track does not belong to the selected category.",
      );
    }
  }

  let subjectDoc = null;
  if (subject) {
    subjectDoc = await Subject.findById(subject);
    if (!subjectDoc) {
      throw new NotFoundError("Selected subject not found.");
    }
    if (subjectDoc.status !== SUBJECT_STATUS.PUBLISHED) {
      throw new BadRequest(
        `Cannot create exam under an unpublished subject (${subjectDoc.status}).`,
      );
    }
  }

  if (topics && topics.length > 0) {
    const topicDocs = await Topic.find({
      _id: { $in: topics },
      status: TOPIC_STATUS.PUBLISHED,
    });

    if (topicDocs.length !== topics.length) {
      throw new BadRequest(
        "One or more selected topics were not found or are not published.",
      );
    }

    // Verify all topics belong to the selected subject
    const invalidTopics = topicDocs.filter(
      (t) => t.subject.toString() !== subjectDoc?._id.toString(),
    );
    if (invalidTopics.length > 0) {
      throw new BadRequest(
        "One or more topics do not belong to the selected subject.",
      );
    }
  }

  // 1.4 Question Assignment / Sampling
  let finalQuestionMappings: Types.ObjectId[] = [];

  if (generationMode === GENERATION_MODE.MANUAL) {
    if (questionMappings.length > 0) {
      const validMappings = await QuestionMapping.find({
        _id: { $in: questionMappings },
      }).select("_id");

      if (validMappings.length !== questionMappings.length) {
        throw new BadRequest(
          "One or more provided question mappings do not exist.",
        );
      }

      finalQuestionMappings = questionMappings.map(
        (id) => new Types.ObjectId(id),
      );
    }
  } else if (generationMode === GENERATION_MODE.RANDOM) {
    // Build query criteria based on hierarchy
    const matchFilter: Record<string, unknown> = {};

    if (category) {
      matchFilter.category = new Types.ObjectId(category);
    }
    if (track) {
      matchFilter.track = new Types.ObjectId(track);
    }
    if (subject) {
      matchFilter.subject = new Types.ObjectId(subject);
    }
    if (topics && topics.length > 0) {
      matchFilter.topic = {
        $in: topics.map((id) => new Types.ObjectId(id)),
      };
    }

    // Verify question pool size before sampling
    const availableCount = await QuestionMapping.countDocuments(matchFilter);
    if (availableCount < totalQuestions) {
      throw new BadRequest(
        `Only ${availableCount} questions available for the selected criteria. Cannot generate an exam with ${totalQuestions} questions.`,
      );
    }

    // Sample questions
    const sampledMappings = await QuestionMapping.aggregate([
      { $match: matchFilter },
      { $sample: { size: totalQuestions } },
      { $project: { _id: 1 } },
    ]);

    finalQuestionMappings = sampledMappings.map((item) => item._id);
  }

  // 1.5 Sanitize Practice Exam Scheduling Fields
  const isPractice = examType === EXAM_TYPE.MODEL_TEST;
  const sanitizedStartTime = isPractice ? null : startTime;
  const sanitizedEndTime = isPractice ? null : endTime;

  // 1.6 Create Document using Discriminator Models
  const basePayload = {
    title,
    slug: uniqueSlug,
    description: description || null,
    generationMode,
    durationMins,
    totalQuestions,
    marksPerQuestion,
    negativeMarks,
    totalMarks,
    passMarks,
    questionMappings: finalQuestionMappings,
    isRandomized,
    isOptionShuffled,
    isSpeedTest,
    examType,
    startTime: sanitizedStartTime,
    endTime: sanitizedEndTime,
    status,
    author: user._id,
  };

  let newExam;
  if (examLevel === EXAM_LEVEL.CATEGORY) {
    newExam = await CategoryExam.create({
      ...basePayload,
      category: categoryDoc!._id,
      track: trackDoc?._id || null,
    });
  } else if (examLevel === EXAM_LEVEL.SUBJECT) {
    newExam = await SubjectExam.create({
      ...basePayload,
      category: categoryDoc?._id || null,
      subject: subjectDoc!._id,
    });
  } else if (examLevel === EXAM_LEVEL.TOPIC) {
    newExam = await TopicExam.create({
      ...basePayload,
      category: categoryDoc?._id || null,
      subject: subjectDoc!._id,
      topics: topics!.map((t) => new Types.ObjectId(t)),
    });
  }

  return newExam;
};

// 2. UPDATE EXAM (Hierarchy is strictly immutable)
const updateExam = async (
  user: IUserDoc,
  id: string,
  payload: TUpdateExamPayloadType,
) => {
  const existingExam = await Exam.findById(id);
  if (!existingExam) {
    throw new NotFoundError("Exam not found.");
  }

  // TODO: When ExamAttempt module is wired, check if student attempts exist:
  // const hasAttempts = await ExamAttempt.exists({ exam: id });
  // if (hasAttempts) disallow changing marks, questions, or duration.

  // Update slug if title changed
  if (payload.title && payload.title !== existingExam.title) {
    existingExam.title = payload.title;
    existingExam.slug = await generateUniqueSlug(payload.title);
  }

  if (payload.description !== undefined) {
    existingExam.description = payload.description;
  }
  if (payload.durationMins !== undefined) {
    existingExam.durationMins = payload.durationMins;
  }
  if (payload.marksPerQuestion !== undefined) {
    existingExam.marksPerQuestion = payload.marksPerQuestion;
    existingExam.totalMarks =
      Math.round(
        existingExam.totalQuestions * payload.marksPerQuestion * 100,
      ) / 100;
  }
  if (payload.negativeMarks !== undefined) {
    existingExam.negativeMarks = payload.negativeMarks;
  }
  if (payload.passMarks !== undefined) {
    existingExam.passMarks = payload.passMarks;
  }
  if (payload.isRandomized !== undefined) {
    existingExam.isRandomized = payload.isRandomized;
  }
  if (payload.isOptionShuffled !== undefined) {
    existingExam.isOptionShuffled = payload.isOptionShuffled;
  }
  if (payload.isSpeedTest !== undefined) {
    existingExam.isSpeedTest = payload.isSpeedTest;
  }
  if (payload.examType !== undefined) {
    existingExam.examType = payload.examType;
  }
  if (payload.startTime !== undefined) {
    existingExam.startTime = payload.startTime;
  }
  if (payload.endTime !== undefined) {
    existingExam.endTime = payload.endTime;
  }
  if (payload.status !== undefined) {
    existingExam.status = payload.status;
  }

  existingExam.editor = user._id;
  await existingExam.save({ validateBeforeSave: true });

  return existingExam;
};

// 3. GET ALL EXAMS
const getAllExam = async (query: TGetAllExamQueryParamsType) => {
  const {
    page,
    limit,
    skip,
    searchTerm,
    sortOrder,
    sortBy,
    fromDate,
    toDate,
  } = formatQuery(query, examSortableFields);

  const { examLevel, examType, status, category, subject } = query;

  const matchFilter: Record<string, unknown> = {};

  if (examLevel) {
    matchFilter.examLevel = examLevel;
  }
  if (examType) {
    matchFilter.examType = examType;
  }
  if (status) {
    matchFilter.status = status;
  }

  // If category is queried: include category-specific exams and universal exams (category = null)
  if (category) {
    matchFilter.$or = [
      { category: new Types.ObjectId(category) },
      { category: null },
    ];
  }

  if (subject) {
    matchFilter.subject = new Types.ObjectId(subject);
  }

  const pipeline: PipelineStage[] = [];

  if (Object.keys(matchFilter).length > 0) {
    pipeline.push({ $match: matchFilter });
  }

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {};
    if (fromDate) dateFilter.$gte = new Date(fromDate);
    if (toDate) dateFilter.$lte = new Date(toDate);
    pipeline.push({ $match: { createdAt: dateFilter } });
  }

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: examSearchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: "i" },
        })),
      },
    });
  }

  // Populate references
  pipeline.push(
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryDetails",
      },
    },
    {
      $unwind: {
        path: "$categoryDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "subjects",
        localField: "subject",
        foreignField: "_id",
        as: "subjectDetails",
      },
    },
    {
      $unwind: {
        path: "$subjectDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
  );

  pipeline.push({ $sort: { [sortBy]: sortOrder } });

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: "total" }],
    },
  });

  const aggregated = await Exam.aggregate(pipeline);

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

// 4. GET EXAM BY ID OR SLUG
const getExamById = async (idOrSlug: string) => {
  const isObjectId = mongoose.isValidObjectId(idOrSlug);
  const query = isObjectId
    ? { _id: new Types.ObjectId(idOrSlug) }
    : { slug: idOrSlug };

  const exam = await Exam.findOne(query)
    .populate("category", "nameBn nameEn slug status")
    .populate("track", "nameBn nameEn slug status")
    .populate("subject", "nameBn nameEn code colorCode slug status")
    .populate("topics", "nameBn nameEn slug status")
    .populate("author", "name email");

  if (!exam) {
    throw new NotFoundError("Exam not found.");
  }

  return exam;
};

// 5. DELETE EXAM BY ID
const deleteExamById = async (id: string) => {
  const existingExam = await Exam.findById(id);
  if (!existingExam) {
    throw new NotFoundError("Exam not found.");
  }

  // TODO: Check if attempts exist:
  // const hasAttempts = await ExamAttempt.exists({ exam: id });
  // if (hasAttempts) throw new BadRequest("Cannot delete an exam with student attempts.");

  if (existingExam.status === EXAM_STATUS.PUBLISHED) {
    throw new BadRequest(
      "Cannot delete a published exam. Please archive it instead.",
    );
  }

  const result = await Exam.findByIdAndDelete(id);
  return result;
};

export const examServices = {
  createExam,
  updateExam,
  getAllExam,
  getExamById,
  deleteExamById,
};

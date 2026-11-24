import mongoose, { type PipelineStage, Types } from "mongoose";
import type {
  TCreateCategoryLevelExamPayloadType,
  TCreateTrackLevelExamPayloadType,
  TCreateSubjectLevelExamPayloadType,
  TCreateTopicLevelExamPayloadType,
  TUpdateExamPayloadType,
  TGetAllExamQueryParamsType,
} from "./exam.validations";
import {
  AppError,
  BadRequest,
  ConflictError,
  NotFoundError,
} from "../../errors";
import {
  Exam,
  CategoryExam,
  TrackExam,
  SubjectExam,
  TopicExam,
} from "./exam.model";
import {
  examSearchableFields,
  examSortableFields,
  EXAM_LEVEL,
  EXAM_STATUS,
  EXAM_TYPE,
  GENERATION_MODE,
  type TGenerationModeType,
} from "./exam.constants";
import { Category, categoryStatus } from "../Category";
import { Track, trackStatus } from "../Track";
import { Subject, SUBJECT_STATUS } from "../Subject";
import { Topic, TOPIC_STATUS } from "../Topic";
import { QuestionMapping } from "../QuestionMapping";
import type { IUserDoc } from "../User";
import { formatQuery } from "@/app/utils";
import { getArticle } from "@/app/utils/get-article";
import { generateUniqueExamSlug } from "./exam.utils";
import { Question, QUESTION_STATUS } from "../Questions";

// Internal Helper: Resolves and validates question mappings for both manual and random modes
interface IResolveQuestionsOptions {
  generationMode: TGenerationModeType;
  questionMappings?: string[];
  totalQuestions: number;
  matchFilter: Record<string, any>;
  validateMappingSyllabus: (mapping: any) => boolean;
  syllabusErrorMessage: string;
}

const resolveExamQuestions = async ({
  generationMode,
  questionMappings = [],
  totalQuestions,
  matchFilter,
  validateMappingSyllabus,
  syllabusErrorMessage,
}: IResolveQuestionsOptions): Promise<Types.ObjectId[]> => {
  if (generationMode === GENERATION_MODE.MANUAL) {
    // 1. Question mappings count check
    if (
      !questionMappings ||
      !Array.isArray(questionMappings) ||
      questionMappings.length !== totalQuestions
    ) {
      throw new BadRequest(
        `You must provide exactly ${totalQuestions} question mappings (received ${questionMappings?.length || 0}).`,
      );
    }

    // 2. Question mappings existence check
    const validQuestionMappings = await QuestionMapping.find({
      _id: { $in: questionMappings },
    });

    if (validQuestionMappings.length !== questionMappings.length) {
      throw new BadRequest("One or more question mappings do not exist.");
    }

    // 3. Unique question mapping IDs check
    const uniqueQuestionMapIds = [
      ...new Set(validQuestionMappings.map((qm) => qm._id.toString())),
    ];

    if (uniqueQuestionMapIds.length !== totalQuestions) {
      throw new BadRequest("Duplicate question mappings are not allowed.");
    }

    // 4. Syllabus hierarchy validation
    const isAllBelongToSyllabus = validQuestionMappings.every(
      validateMappingSyllabus,
    );

    if (!isAllBelongToSyllabus) {
      throw new BadRequest(syllabusErrorMessage);
    }

    // 5. Unique underlying questions check
    const allQuestionIds = [
      ...new Set(validQuestionMappings.map((qm) => qm.question.toString())),
    ];
    if (allQuestionIds.length !== totalQuestions) {
      throw new BadRequest("Duplicate questions are not allowed.");
    }

    // 6. Question status check (must be published)
    const allQuestions = await Question.find({
      _id: { $in: allQuestionIds },
      status: QUESTION_STATUS.PUBLISHED,
    }).select("status");

    if (allQuestions.length !== totalQuestions) {
      throw new BadRequest(
        "Only published questions are allowed to create an exam.",
      );
    }

    return uniqueQuestionMapIds.map((id) => new Types.ObjectId(id));
  }

  // Random generation mode via QuestionMapping aggregation
  const automaticMappedQuestions = await QuestionMapping.aggregate([
    {
      $match: matchFilter,
    },
    {
      $lookup: {
        from: "questions",
        localField: "question",
        foreignField: "_id",
        as: "questionDetails",
        pipeline: [{ $match: { status: QUESTION_STATUS.PUBLISHED } }],
      },
    },
    {
      $unwind: {
        path: "$questionDetails",
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $group: {
        _id: "$question",
        mappingId: { $first: "$_id" },
      },
    },
    {
      $sample: { size: totalQuestions },
    },
    {
      $project: {
        _id: 0,
        mappingId: 1,
      },
    },
  ]);

  if (!automaticMappedQuestions.length) {
    throw new BadRequest("No questions found matching the criteria.");
  }

  if (automaticMappedQuestions.length < totalQuestions) {
    throw new BadRequest(
      `Only ${automaticMappedQuestions.length} questions available for the selected criteria. Cannot generate an exam with ${totalQuestions} questions.`,
    );
  }

  return automaticMappedQuestions.map((item) => new Types.ObjectId(item.mappingId));
};

// 1. CREATE Category Exam
const createCategoryExam = async (
  user: IUserDoc,
  payload: TCreateCategoryLevelExamPayloadType,
) => {
  const {
    title,
    description,
    category,
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
  } = payload;

  // 1. Verify category existence and status
  const existingCategory = await Category.findById(category);
  if (!existingCategory) {
    throw new NotFoundError("Category not found.");
  }

  if (existingCategory.status !== categoryStatus.PUBLISHED) {
    throw new BadRequest(
      `You can not create exam under ${getArticle(existingCategory.status)} category.`,
    );
  }

  // 2. Resolve question mappings
  const finalQuestionMappings = await resolveExamQuestions({
    generationMode,
    questionMappings,
    totalQuestions,
    matchFilter: {
      category: existingCategory._id,
    },
    validateMappingSyllabus: (qm) =>
      qm.category.toString() === existingCategory._id.toString(),
    syllabusErrorMessage:
      "All question mappings must belong to the selected category.",
  });

  // 3. Compute Total Marks
  const totalMarks = Math.round(totalQuestions * marksPerQuestion * 100) / 100;

  // 4. Generate Unique Slug
  const uniqueSlug = await generateUniqueExamSlug(title);

  // 5. Sanitize Practice Exam Scheduling Fields
  const isPractice = examType === EXAM_TYPE.MODEL_TEST;
  const sanitizedStartTime = isPractice ? null : startTime;
  const sanitizedEndTime = isPractice ? null : endTime;

  // 6. Create Document using Discriminator Model
  const newExam = await CategoryExam.create({
    title,
    slug: uniqueSlug,
    description: description || null,
    category: existingCategory._id,
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
    status: EXAM_STATUS.DRAFT,
    author: user._id,
  });

  return newExam;
};

// 2. CREATE Track Exam
const createTrackExam = async (
  user: IUserDoc,
  payload: TCreateTrackLevelExamPayloadType,
) => {
  const {
    title,
    description,
    category,
    track,
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
  } = payload;

  // 1. Verify category existence and status
  const existingCategory = await Category.findById(category);
  if (!existingCategory) {
    throw new NotFoundError("Category not found.");
  }
  if (existingCategory.status !== categoryStatus.PUBLISHED) {
    throw new BadRequest(
      `You can not create exam under ${getArticle(existingCategory.status)} category.`,
    );
  }

  // 2. Verify track existence and status
  const existingTrack = await Track.findById(track);
  if (!existingTrack) {
    throw new NotFoundError("Track not found.");
  }
  if (existingTrack.status !== trackStatus.PUBLISHED) {
    throw new BadRequest(
      `You can not create exam under ${getArticle(existingTrack.status)} track.`,
    );
  }

  // 3. Verify track belongs to the category
  if (existingTrack.category.toString() !== existingCategory._id.toString()) {
    throw new BadRequest(
      "The selected track does not belong to the selected category.",
    );
  }

  // 4. Resolve question mappings
  const finalQuestionMappings = await resolveExamQuestions({
    generationMode,
    questionMappings,
    totalQuestions,
    matchFilter: {
      category: existingCategory._id,
      track: existingTrack._id,
    },
    validateMappingSyllabus: (qm) =>
      qm.category.toString() === existingCategory._id.toString() &&
      qm.track?.toString() === existingTrack._id.toString(),
    syllabusErrorMessage:
      "All question mappings must belong to the selected category and track.",
  });

  // 5. Compute Total Marks
  const totalMarks = Math.round(totalQuestions * marksPerQuestion * 100) / 100;

  // 6. Generate Unique Slug
  const uniqueSlug = await generateUniqueExamSlug(title);

  // 7. Sanitize Practice Exam Scheduling Fields
  const isPractice = examType === EXAM_TYPE.MODEL_TEST;
  const sanitizedStartTime = isPractice ? null : startTime;
  const sanitizedEndTime = isPractice ? null : endTime;

  // 8. Create Document using TrackExam Discriminator Model
  const newExam = await TrackExam.create({
    title,
    slug: uniqueSlug,
    description: description || null,
    category: existingCategory._id,
    track: existingTrack._id,
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
    status: EXAM_STATUS.DRAFT,
    author: user._id,
  });

  return newExam;
};

// 3. CREATE Subject Exam
const createSubjectExam = async (
  user: IUserDoc,
  payload: TCreateSubjectLevelExamPayloadType,
) => {
  const {
    title,
    description,
    subject,
    category,
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
  } = payload;

  // 1. Verify subject existence and status
  const existingSubject = await Subject.findById(subject);
  if (!existingSubject) {
    throw new NotFoundError("Subject not found.");
  }
  if (existingSubject.status !== SUBJECT_STATUS.PUBLISHED) {
    throw new BadRequest(
      `You can not create exam under ${getArticle(existingSubject.status)} subject.`,
    );
  }

  // 2. Verify optional category if provided
  let existingCategory = null;
  if (category) {
    existingCategory = await Category.findById(category);
    if (!existingCategory) {
      throw new NotFoundError("Category not found.");
    }
    if (existingCategory.status !== categoryStatus.PUBLISHED) {
      throw new BadRequest(
        `You can not create exam under ${getArticle(existingCategory.status)} category.`,
      );
    }
  }

  // 3. Resolve question mappings
  const matchFilter: Record<string, any> = {
    subject: existingSubject._id,
  };
  if (existingCategory) {
    matchFilter.category = existingCategory._id;
  }

  const finalQuestionMappings = await resolveExamQuestions({
    generationMode,
    questionMappings,
    totalQuestions,
    matchFilter,
    validateMappingSyllabus: (qm) =>
      qm.subject.toString() === existingSubject._id.toString() &&
      (!existingCategory ||
        qm.category.toString() === existingCategory._id.toString()),
    syllabusErrorMessage: existingCategory
      ? "All question mappings must belong to the selected category and subject."
      : "All question mappings must belong to the selected subject.",
  });

  // 4. Compute Total Marks
  const totalMarks = Math.round(totalQuestions * marksPerQuestion * 100) / 100;

  // 5. Generate Unique Slug
  const uniqueSlug = await generateUniqueExamSlug(title);

  // 6. Sanitize Practice Exam Scheduling Fields
  const isPractice = examType === EXAM_TYPE.MODEL_TEST;
  const sanitizedStartTime = isPractice ? null : startTime;
  const sanitizedEndTime = isPractice ? null : endTime;

  // 7. Create Document using SubjectExam Discriminator Model
  const newExam = await SubjectExam.create({
    title,
    slug: uniqueSlug,
    description: description || null,
    subject: existingSubject._id,
    category: existingCategory ? existingCategory._id : null,
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
    status: EXAM_STATUS.DRAFT,
    author: user._id,
  });

  return newExam;
};

// 4. CREATE Topic Exam
const createTopicExam = async (
  user: IUserDoc,
  payload: TCreateTopicLevelExamPayloadType,
) => {
  const {
    title,
    description,
    subject,
    topics,
    category,
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
  } = payload;

  // 1. Verify subject existence and status
  const existingSubject = await Subject.findById(subject);
  if (!existingSubject) {
    throw new NotFoundError("Subject not found.");
  }
  if (existingSubject.status !== SUBJECT_STATUS.PUBLISHED) {
    throw new BadRequest(
      `You can not create exam under ${getArticle(existingSubject.status)} subject.`,
    );
  }

  // 2. Verify optional category if provided
  let existingCategory = null;
  if (category) {
    existingCategory = await Category.findById(category);
    if (!existingCategory) {
      throw new NotFoundError("Category not found.");
    }
    if (existingCategory.status !== categoryStatus.PUBLISHED) {
      throw new BadRequest(
        `You can not create exam under ${getArticle(existingCategory.status)} category.`,
      );
    }
  }

  // 3. Verify topics existence, status, and subject belonging
  const uniqueTopicIdStrings = [
    ...new Set(topics.map((t) => t.toString())),
  ];
  if (uniqueTopicIdStrings.length !== topics.length) {
    throw new BadRequest("Duplicate topics are not allowed.");
  }


  const existingTopics = await Topic.find({
    _id: { $in: uniqueTopicIdStrings },
  });
  if (existingTopics.length !== uniqueTopicIdStrings.length) {
    throw new BadRequest("One or more topics do not exist.");
  }

  const unpublishedTopic = existingTopics.find(
    (t) => t.status !== TOPIC_STATUS.PUBLISHED,
  );
  if (unpublishedTopic) {
    throw new BadRequest(
      `Topic "${unpublishedTopic.nameEn}" is not published. Only published topics can be included in exams.`,
    );
  }

  const isAllBelongToSubject = existingTopics.every(
    (t) => t.subject.toString() === existingSubject._id.toString(),
  );
  if (!isAllBelongToSubject) {
    throw new BadRequest("All topics must belong to the selected subject.");
  }

  const validTopicObjectIds = existingTopics.map((t) => t._id);
  const topicIdSet = new Set(uniqueTopicIdStrings);

  // 4. Resolve question mappings
  const matchFilter: Record<string, any> = {
    subject: existingSubject._id,
    topic: { $in: validTopicObjectIds },
  };
  if (existingCategory) {
    matchFilter.category = existingCategory._id;
  }

  const finalQuestionMappings = await resolveExamQuestions({
    generationMode,
    questionMappings,
    totalQuestions,
    matchFilter,
    validateMappingSyllabus: (qm) =>
      qm.subject.toString() === existingSubject._id.toString() &&
      topicIdSet.has(qm.topic.toString()) &&
      (!existingCategory ||
        qm.category.toString() === existingCategory._id.toString()),
    syllabusErrorMessage: existingCategory
      ? "All question mappings must belong to the selected category, subject, and topics."
      : "All question mappings must belong to the selected subject and topics.",
  });

  // 5. Compute Total Marks
  const totalMarks = Math.round(totalQuestions * marksPerQuestion * 100) / 100;

  // 6. Generate Unique Slug
  const uniqueSlug = await generateUniqueExamSlug(title);

  // 7. Sanitize Practice Exam Scheduling Fields
  const isPractice = examType === EXAM_TYPE.MODEL_TEST;
  const sanitizedStartTime = isPractice ? null : startTime;
  const sanitizedEndTime = isPractice ? null : endTime;

  // 8. Create Document using TopicExam Discriminator Model
  const newExam = await TopicExam.create({
    title,
    slug: uniqueSlug,
    description: description || null,
    subject: existingSubject._id,
    topics: validTopicObjectIds,
    category: existingCategory ? existingCategory._id : null,
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
    status: EXAM_STATUS.DRAFT,
    author: user._id,
  });

  return newExam;
};

// 2. UPDATE EXAM (Hierarchy is strictly immutable)
const updateExam = async (
  user: IUserDoc,
  id: string,
  payload: TUpdateExamPayloadType,
) => {
  const {
    // Meta
    title,
    description,

    // Duration & Timing
    durationMins,
    startTime,
    endTime,

    // Marks
    marksPerQuestion,
    negativeMarks,
    passMarks,

    // Exam Type
    examType,

    // Configurations
    isOptionShuffled,
    isRandomized,
    isSpeedTest,
  } = payload;

  // 1. Check if exam exists:
  const existingExam = await Exam.findById(id);
  if (!existingExam) {
    throw new NotFoundError("Exam not found.");
  }

  // 2. Disallow updating archived exams:
  if (existingExam.status === EXAM_STATUS.ARCHIVED) {
    throw new BadRequest("You cannot update an archived exam.");
  }

  // TODO: Check if any student attempts exist when ExamAttempt module is wired:
  // const hasExamAttempts = await ExamAttempt.exists({ exam: id });
  // if (hasExamAttempts) {
  //   throw new BadRequest("Cannot modify core exam settings once student attempts exist.");
  // }

  // 3. Title & Slug Update:
  if (title !== undefined && title !== existingExam.title) {
    existingExam.title = title;
    existingExam.slug = await generateUniqueExamSlug(title);
  }

  // 4. Description Update:
  if (description !== undefined) {
    existingExam.description = description || null;
  }

  // 5. Exam Type & Timing (Live, Model Test, Archive)
  const effectiveExamType =
    examType !== undefined ? examType : existingExam.examType;
  const effectiveDurationMins =
    durationMins !== undefined ? durationMins : existingExam.durationMins;
  const effectiveStartTime =
    startTime !== undefined ? startTime : existingExam.startTime;
  const effectiveEndTime =
    endTime !== undefined ? endTime : existingExam.endTime;

  // Disallow converting an archived exam back to live
  if (
    existingExam.examType === EXAM_TYPE.ARCHIVE &&
    effectiveExamType === EXAM_TYPE.LIVE
  ) {
    throw new BadRequest(
      "Cannot convert an archived exam back to a live exam.",
    );
  }

  if (effectiveExamType === EXAM_TYPE.LIVE) {
    if (!effectiveStartTime || !effectiveEndTime) {
      throw new BadRequest(
        "Start time and end time are required for live exams.",
      );
    }

    const startMs = new Date(effectiveStartTime).getTime();
    const endMs = new Date(effectiveEndTime).getTime();

    // If startTime is updated or exam is newly converted to live, ensure start time is in the future
    if (
      (startTime !== undefined || existingExam.examType !== EXAM_TYPE.LIVE) &&
      startMs < Date.now()
    ) {
      throw new BadRequest("Start time cannot be in the past for live exams.");
    }

    if (startMs >= endMs) {
      throw new BadRequest("End time must be after start time.");
    }

    const windowMins = (endMs - startMs) / (1000 * 60);
    if (windowMins !== effectiveDurationMins) {
      throw new BadRequest(
        `For strict live exams, the time window (${windowMins} mins) must be exactly equal to the exam duration (${effectiveDurationMins} mins).`,
      );
    }

    existingExam.examType = EXAM_TYPE.LIVE;
    existingExam.startTime = new Date(effectiveStartTime);
    existingExam.endTime = new Date(effectiveEndTime);
  } else if (effectiveExamType === EXAM_TYPE.MODEL_TEST) {
    existingExam.examType = EXAM_TYPE.MODEL_TEST;
    existingExam.startTime = null;
    existingExam.endTime = null;
  } else if (effectiveExamType === EXAM_TYPE.ARCHIVE) {
    existingExam.examType = EXAM_TYPE.ARCHIVE;
    // Retain historical start and end times if available
  }

  existingExam.durationMins = effectiveDurationMins;

  // 6. Marks Validation & Synchronization (Merging Previous & New Data)
  const effectiveMarksPerQuestion =
    marksPerQuestion !== undefined
      ? marksPerQuestion
      : existingExam.marksPerQuestion;
  const effectiveNegativeMarks =
    negativeMarks !== undefined ? negativeMarks : existingExam.negativeMarks;
  const effectivePassMarks =
    passMarks !== undefined ? passMarks : existingExam.passMarks;

  // Total marks auto-calculated using immutable totalQuestions and effective marksPerQuestion
  const calculatedTotalMarks =
    Math.round(existingExam.totalQuestions * effectiveMarksPerQuestion * 100) /
    100;

  // Negative marks must be strictly less than marks per question
  if (effectiveNegativeMarks >= effectiveMarksPerQuestion) {
    throw new BadRequest(
      `Negative marks (${effectiveNegativeMarks}) must be less than marks per question (${effectiveMarksPerQuestion}).`,
    );
  }

  // Pass marks cannot exceed the calculated total marks
  if (effectivePassMarks > calculatedTotalMarks) {
    throw new BadRequest(
      `Pass marks (${effectivePassMarks}) cannot exceed the total marks (${calculatedTotalMarks}).`,
    );
  }

  existingExam.marksPerQuestion = effectiveMarksPerQuestion;
  existingExam.negativeMarks = effectiveNegativeMarks;
  existingExam.totalMarks = calculatedTotalMarks;
  existingExam.passMarks = effectivePassMarks;

  // 7. Configurations
  if (isOptionShuffled !== undefined) {
    existingExam.isOptionShuffled = isOptionShuffled;
  }
  if (isRandomized !== undefined) {
    existingExam.isRandomized = isRandomized;
  }
  if (isSpeedTest !== undefined) {
    existingExam.isSpeedTest = isSpeedTest;
  }

  existingExam.editor = user._id;
  await existingExam.save({ validateBeforeSave: true });

  return existingExam;
};

// 5. GET ALL EXAMS
const getAllExam = async (query: TGetAllExamQueryParamsType) => {
  const { page, limit, skip, searchTerm, sortOrder, sortBy, fromDate, toDate } =
    formatQuery(query, examSortableFields);

  const { examLevel, examType, status, category, track, subject } = query;

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

  if (track) {
    matchFilter.track = new Types.ObjectId(track);
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
        from: "tracks",
        localField: "track",
        foreignField: "_id",
        as: "trackDetails",
      },
    },
    {
      $unwind: {
        path: "$trackDetails",
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

// 6. GET EXAM BY ID OR SLUG
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

// 7. DELETE EXAM BY ID
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

// 8. MARK EXAM AS PUBLISHED
const markAsPublished = async (user: IUserDoc, id: string) => {
  const exam = await Exam.findById(id);
  if (!exam) {
    throw new NotFoundError("Exam not found.");
  }

  // 1. Check if already archived
  if (exam.status === EXAM_STATUS.ARCHIVED) {
    throw new BadRequest("Cannot publish an archived exam.");
  }

  // 2. Check if already published
  if (exam.status === EXAM_STATUS.PUBLISHED) {
    throw new BadRequest("This exam has already been published.");
  }

  // 3. Re-validate Syllabus Hierarchy at Publish Time
  if (exam.category) {
    const category = await Category.findById(exam.category);
    if (!category || category.status !== categoryStatus.PUBLISHED) {
      throw new BadRequest(
        "Cannot publish exam because the assigned category is not published.",
      );
    }
  }

  if (exam.track) {
    const track = await Track.findById(exam.track);
    if (!track || track.status !== trackStatus.PUBLISHED) {
      throw new BadRequest(
        "Cannot publish exam because the assigned track is not published.",
      );
    }
  }

  if (exam.subject) {
    const subject = await Subject.findById(exam.subject);
    if (!subject || subject.status !== SUBJECT_STATUS.PUBLISHED) {
      throw new BadRequest(
        "Cannot publish exam because the assigned subject is not published.",
      );
    }
  }

  if (exam.topics && exam.topics.length > 0) {
    const publishedTopicsCount = await Topic.countDocuments({
      _id: { $in: exam.topics },
      status: TOPIC_STATUS.PUBLISHED,
    });
    if (publishedTopicsCount !== exam.topics.length) {
      throw new BadRequest(
        "Cannot publish exam because one or more assigned topics are missing or not published.",
      );
    }
  }

  // 4. Validate Question Mappings and Underlying Questions at Publish Time
  if (
    !exam.questionMappings ||
    exam.questionMappings.length !== exam.totalQuestions
  ) {
    throw new BadRequest(
      `Cannot publish exam: expected ${exam.totalQuestions} question mappings but found ${exam.questionMappings?.length || 0}.`,
    );
  }

  const validMappings = await QuestionMapping.find({
    _id: { $in: exam.questionMappings },
  });

  if (validMappings.length !== exam.totalQuestions) {
    throw new BadRequest(
      "Cannot publish exam because one or more question mappings no longer exist.",
    );
  }

  const questionIds = validMappings.map((m) => m.question);
  const publishedQuestionsCount = await Question.countDocuments({
    _id: { $in: questionIds },
    status: QUESTION_STATUS.PUBLISHED,
  });

  if (publishedQuestionsCount !== exam.totalQuestions) {
    throw new BadRequest(
      `Cannot publish exam: ${exam.totalQuestions - publishedQuestionsCount} question(s) are missing or not in published status.`,
    );
  }

  // 5. Live Exam Schedule Validation at Publish Time
  if (exam.examType === EXAM_TYPE.LIVE) {
    if (!exam.startTime || !exam.endTime) {
      throw new BadRequest(
        "Cannot publish a live exam without start and end times.",
      );
    }

    const startMs = new Date(exam.startTime).getTime();
    const endMs = new Date(exam.endTime).getTime();

    if (startMs < Date.now()) {
      throw new BadRequest(
        "Cannot publish a live exam whose scheduled start time has already passed. Please update the schedule first.",
      );
    }

    if (startMs >= endMs) {
      throw new BadRequest("End time must be after start time.");
    }

    const windowMins = (endMs - startMs) / (1000 * 60);
    if (windowMins !== exam.durationMins) {
      throw new BadRequest(
        `For strict live exams, the time window (${windowMins} mins) must be exactly equal to the exam duration (${exam.durationMins} mins).`,
      );
    }
  }

  exam.status = EXAM_STATUS.PUBLISHED;
  exam.publishedAt = new Date();
  exam.editor = user._id;

  await exam.save({ validateBeforeSave: true });
  return exam;
};

// 9. MARK EXAM AS ARCHIVED
const markAsArchived = async (user: IUserDoc, id: string) => {
  const exam = await Exam.findById(id);
  if (!exam) {
    throw new NotFoundError("Exam not found.");
  }

  // 1. Check if already archived
  if (exam.status === EXAM_STATUS.ARCHIVED) {
    throw new BadRequest("This exam has already been archived.");
  }

  // 2. Disallow archiving a draft directly
  if (exam.status === EXAM_STATUS.DRAFT) {
    throw new BadRequest(
      "Cannot archive a drafted exam. You can delete it or publish it first.",
    );
  }

  // 3. Disallow archiving while live exam is currently active
  if (exam.examType === EXAM_TYPE.LIVE && exam.startTime && exam.endTime) {
    const now = Date.now();
    const startMs = new Date(exam.startTime).getTime();
    const endMs = new Date(exam.endTime).getTime();

    if (now >= startMs && now <= endMs) {
      throw new BadRequest(
        "Cannot archive a live exam while it is currently in progress. Please wait until the exam window ends.",
      );
    }
  }

  exam.status = EXAM_STATUS.ARCHIVED;
  exam.archivedAt = new Date();
  exam.editor = user._id;

  await exam.save({ validateBeforeSave: true });
  return exam;
};

// 10. MARK EXAM AS DRAFT (UNPUBLISH)
const markAsDraft = async (user: IUserDoc, id: string) => {
  const exam = await Exam.findById(id);
  if (!exam) {
    throw new NotFoundError("Exam not found.");
  }

  // 1. Check if already draft
  if (exam.status === EXAM_STATUS.DRAFT) {
    throw new BadRequest("This exam is already in draft status.");
  }

  // 2. Disallow reverting an archived exam to draft
  if (exam.status === EXAM_STATUS.ARCHIVED) {
    throw new BadRequest("Cannot revert an archived exam back to draft.");
  }

  // 3. Disallow unpublishing an ongoing or completed live exam
  if (exam.examType === EXAM_TYPE.LIVE && exam.startTime) {
    const startMs = new Date(exam.startTime).getTime();
    if (Date.now() >= startMs) {
      throw new BadRequest(
        "Cannot unpublish a live exam that has already started or ended. Please archive it instead.",
      );
    }
  }

  // TODO: Check if attempts exist when ExamAttempt model is wired:
  // const hasAttempts = await ExamAttempt.exists({ exam: id });
  // if (hasAttempts) throw new BadRequest("Cannot unpublish an exam that has student attempts. Please archive it instead.");

  exam.status = EXAM_STATUS.DRAFT;
  exam.editor = user._id;

  await exam.save({ validateBeforeSave: true });
  return exam;
};

export const examServices = {
  createCategoryExam,
  createTrackExam,
  createSubjectExam,
  createTopicExam,
  updateExam,
  getAllExam,
  getExamById,
  deleteExamById,
  markAsPublished,
  markAsArchived,
  markAsDraft,
};

import httpStatus from "http-status";
import mongoose, { type PipelineStage, Types } from "mongoose";
import type {
  TCreateCategoryLevelExamPayloadType,
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
import { QuestionMapping } from "../QuestionMapping";
import type { IUserDoc } from "../User";
import { formatQuery, generateSlug } from "@/app/utils";
import { getArticle } from "@/app/utils/get-article";
import { generateUniqueExamSlug } from "./exam.utils";
import { Question, QUESTION_STATUS } from "../Questions";

// 1. CREATE EXAM
const createCategoryExam = async (user: IUserDoc, payload: TCreateCategoryLevelExamPayloadType) => {
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

  // 1 Check is category exists ?: 
  const existingCategory  = await Category.findById(category)

  if (!existingCategory) { 
    throw new NotFoundError("Category not found.")
  }

  if (existingCategory.status !== categoryStatus.PUBLISHED) { 
    throw new BadRequest(`You can not create exam under ${getArticle(existingCategory.status)} category.`)
  }

  let finalQuestionMappings: Types.ObjectId[] = [];
  // 2. Check generation mode and find out all the question and are they unique?: 
  if (generationMode === GENERATION_MODE.MANUAL) {

    // 2.1: Question Map Length check: 
    if (
      !questionMappings ||
      !Array.isArray(questionMappings) ||
      questionMappings.length !== totalQuestions
    ) { 
      throw new BadRequest(
        `You must provide exactly ${totalQuestions} question mappings (received ${questionMappings?.length || 0}).`,
      );
    }

    // 2.2: Question Map Existence check: 
    const validQuestionMappings = await QuestionMapping.find({
      _id: { $in: questionMappings }, 
    });

    if (validQuestionMappings.length !== questionMappings.length) {
      throw new BadRequest("One or more question mappings do not exist.");
    }

    // 2.3: Check all the question map is unique: 
    const uniqueQuestionMapIds = [
      ...new Set(validQuestionMappings.map((qm) => qm._id.toString())),
    ];

    if (uniqueQuestionMapIds.length !== totalQuestions) {
      throw new BadRequest("Duplicate question mappings are not allowed.");
    } 

    // 2.4: Category Validation: 
    const isAllBelongToSelectedCategory = validQuestionMappings.every(
      (qm) => qm.category.toString() === existingCategory._id.toString(),
    );
    if (!isAllBelongToSelectedCategory) {
      throw new BadRequest(
        "All question mappings must belong to the selected category.",
      );
    }

    // 2.5: Check all underlying questions are unique: 
    const allQuestionIds = [
      ...new Set(validQuestionMappings.map((qm) => qm.question.toString())),
    ]; 
    if (allQuestionIds.length !== totalQuestions) {
      throw new BadRequest("Duplicate questions are not allowed.");
    }

    // 2.6: Question Status Check: 
    const allQuestions = await Question.find({
      _id: { $in: allQuestionIds },
      status: QUESTION_STATUS.PUBLISHED,
    }).select("status");

    if (allQuestions.length !== totalQuestions) {
      throw new BadRequest(
        "Only published questions are allowed to create an exam.",
      );
    } 

    finalQuestionMappings = uniqueQuestionMapIds.map(
      (id) => new Types.ObjectId(id),
    ); 
  
  } else  if (generationMode === GENERATION_MODE.RANDOM) {

    const automaticMappedQuestions = await QuestionMapping.aggregate([
      {
        $match: {
          category: existingCategory?._id,
        }
      }, 
      {
        $lookup: {
          from: "questions",
          localField: "question",
          foreignField: "_id",
          as: "questionDetails",
          pipeline: [
            { $match: { status: QUESTION_STATUS.PUBLISHED } }
          ]
        }
      }, 
      {
        $unwind: { 
          path: "$questionDetails", 
          preserveNullAndEmptyArrays: false
        }
      }, 
      { 
        $group: { 
          _id: "$question",
          mappingId: {$first: "$_id"}
        }
      }, 
      {
        $sample: {size: totalQuestions }
      }, 
      {
        $project: {
          _id: 0,
          mappingId: 1
        }
      }      
    ])

    if (!automaticMappedQuestions.length) {
      throw new BadRequest("No questions found matching the criteria.")
    }

    if (automaticMappedQuestions?.length < totalQuestions ) {
      throw new BadRequest(`Only ${automaticMappedQuestions?.length} questions available for the selected criteria. Cannot generate an exam with ${totalQuestions} questions.`)
    }



    finalQuestionMappings = automaticMappedQuestions.map((item) => item.mappingId)      


  }



  // 3. Compute Total Marks
  const totalMarks =
    Math.round(totalQuestions * marksPerQuestion * 100) / 100;

  // 4. Generate Unique Slug
  const uniqueSlug = await generateUniqueExamSlug(title); 
  
  // 1.5 Sanitize Practice Exam Scheduling Fields
  const isPractice = examType === EXAM_TYPE.MODEL_TEST;
  const sanitizedStartTime = isPractice ? null : startTime;
  const sanitizedEndTime = isPractice ? null : endTime;

  // 1.6 Create Document using Discriminator Models
  const newExam = await CategoryExam.create({
    title,
    slug: uniqueSlug,
    description: description || null,
    category: existingCategory?._id,
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

  return newExam
  
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
  createExam: createCategoryExam,
  updateExam,
  getAllExam,
  getExamById,
  deleteExamById,
};

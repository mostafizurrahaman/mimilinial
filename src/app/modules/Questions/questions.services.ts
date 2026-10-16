import httpStatus from "http-status";
import type { PipelineStage } from "mongoose";

import { AppError, ConflictError, NotFoundError } from "../../errors";
import { Questions } from "./questions.model";
import {
  QUESTION_STATUS,
  QUESTION_TYPE,
  questionsSearchableFields,
} from "./questions.constants";
import type { TCreateSingleMcqQuestionPayloadType } from "./questions.validations";
import type { IUser, IUserDoc } from "../User";
import { Passage } from "../Passage";
import { questionUtils } from "../QuestionVersion/question-utils";
import {
  questionVersionServices,
  SingleMcqVersion,
  type IQuestionOption,
} from "../QuestionVersion";
import mongoose from "mongoose";
import { extractCloudinaryImages } from "@/app/utils/extract-cloudinary-images";

// 1. CREATE QUESTIONS
const createQuestions = async (
  user: IUserDoc,
  payload: TCreateSingleMcqQuestionPayloadType,
) => {
  // Payload extract:
  const {
    passageId,
    stem,
    options,
    explanation,
    changeLog,
    difficulty,
    mediaUrl,
  } = payload;

  //  Validate the question:
  questionUtils.validateByType(QUESTION_TYPE.SINGLE_MCQ, options);

  // Check is passage exists ?:
  const existingPassage = await Passage.findById(passageId);
  if (!existingPassage) {
    throw new NotFoundError("Pasasge not found.");
  }

  //  Hash content:
  const hashedContent = questionUtils.generateContentHash({
    type: QUESTION_TYPE.SINGLE_MCQ,
    stem,
    options: options as IQuestionOption[],
  });

  //  Check hash already exists?:
  const duplicateContent =
    await questionVersionServices.checkDuplicateByHash(hashedContent);

  if (duplicateContent) {
    throw new ConflictError("The question with same options arleady exists.");
  }

  // Generate code:
  const code = await questionUtils.generateUniqueQuestionCode();
  const slug = questionUtils.generateSafeQuestionSlug(stem, code);
  const language = questionUtils.detectLanguage(stem);
  const planHtml = questionUtils.stripHtml(stem);

  // Check is the slug aready in use:
  const duplicateSlug = await Questions.exists({ slug });

  if (duplicateSlug) {
    throw new ConflictError(
      `Please try again with a new code/slug for this question.`,
    );
  }

  const mediaUrls: string[] = [];

  if (mediaUrl) mediaUrls.push(mediaUrl);

  const contents: string[] = [stem];

  if (explanation) return contents.push(explanation as string);
  options.forEach((opt) => {
    if (opt.content) contents.push(opt.content);
    if (opt.mediaUrl) mediaUrls.push(opt.mediaUrl);
  });

  const contentUrls = extractCloudinaryImages(contents);

  if (contentUrls.length > 0) {
    mediaUrls.push(...contentUrls);
  }

  // Session :
  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    //  Create the question:

    const questionPayload = {
      code,
      slug,
      type: QUESTION_TYPE.SINGLE_MCQ,
      difficulty: difficulty || "medium",
      status: QUESTION_STATUS.DRAFT,
      passageId: existingPassage?._id || undefined,
      isFlagged: false,
      language,
      author: user._id,
    };

    const question = await Questions.create([questionPayload], {
      session: mongoSession,
    });

    if (!question?.[0]) {
      throw new ConflictError("Failed to create question");
    }

    // Create version
    const singleMcqVersionPayload = {
      type: QUESTION_TYPE.SINGLE_MCQ,
      question: question[0]._id,
      versionNumber: 1,
      isCurrent: true,
      stem,
      planStem: planHtml,
      options: options as IQuestionOption[],
      contentHash: hashedContent,
      language,
      explanation,
      changeLog,
      mediaUrl,
      author: user._id,
    };

    const version = await SingleMcqVersion.create([singleMcqVersionPayload], {
      session: mongoSession,
    });

    if (!version?.[0]) {
      throw new ConflictError("Failed to create question version");
    }
  } catch (error) {}

  const result = await Questions.create(payload);
  return result;
};

// // 2. UPDATE QUESTIONS
// const updateQuestions = async (
//   id: string,
//   payload: TUpdateQuestionsPayloadType,
// ) => {
//   const result = await Questions.findOneAndUpdate(
//     { _id: id },
//     { $set: payload },
//     { new: true },
//   );

//   if (!result) {
//     throw new AppError(httpStatus.NOT_FOUND, "Questions not found");
//   }

//   return result;
// };

// // 3. GET ALL QUESTIONS
// const getAllQuestions = async (query: TGetAllQuestionsQueryParamsType) => {
//   const { page, limit, skip, searchTerm, sortOrder, sortBy, fromDate, toDate } =
//     formatQuery(query, questionsSortableFields);

//   const pipeline: PipelineStage[] = [];

//   if (fromDate || toDate) {
//     const dateFilter: Record<string, unknown> = {};
//     if (fromDate) dateFilter.$gte = new Date(fromDate);
//     if (toDate) dateFilter.$lte = new Date(toDate);

//     pipeline.push({ $match: { createdAt: dateFilter } });
//   }

//   if (searchTerm) {
//     pipeline.push({
//       $match: {
//         $or: questionsSearchableFields.map((field) => ({
//           [field]: { $regex: searchTerm, $options: "i" },
//         })),
//       },
//     });
//   }

//   pipeline.push({ $sort: { [sortBy]: sortOrder } });

//   pipeline.push({
//     $facet: {
//       data: [{ $skip: skip }, { $limit: limit }],
//       meta: [{ $count: "total" }],
//     },
//   });

//   const aggregated = await Questions.aggregate(pipeline);

//   const data = aggregated?.[0]?.data || [];
//   const total = aggregated?.[0]?.meta?.[0]?.total || 0;

//   return {
//     data,
//     meta: {
//       page,
//       limit,
//       total,
//       totalPages: Math.ceil(total / limit) || 1,
//     },
//   };
// };

// // 4. GET QUESTIONS BY ID
// const getQuestionsById = async (id: string) => {
//   const result = await Questions.findById(id);

//   if (!result) {
//     throw new AppError(httpStatus.NOT_FOUND, "Questions not found");
//   }

//   return result;
// };

// // 5. DELETE QUESTIONS BY ID
// const deleteQuestionsById = async (id: string) => {
//   const result = await Questions.findOneAndDelete({ _id: id });

//   if (!result) {
//     throw new AppError(httpStatus.NOT_FOUND, "Questions not found");
//   }

//   return result;
// };

export const questionsServices = {
  createQuestions,
  //   updateQuestions,
  //   getAllQuestions,
  //   getQuestionsById,
  //   deleteQuestionsById,
};

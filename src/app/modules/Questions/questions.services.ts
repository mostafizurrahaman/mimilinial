import httpStatus from "http-status";
import type { PipelineStage } from "mongoose";

import { AppError, ConflictError, NotFoundError } from "../../errors";
import { Question } from "./questions.model";
import {
  QUESTION_STATUS,
  QUESTION_TYPE,
  questionsSearchableFields,
} from "./questions.constants";
import type {
  TCreateMultiMcqQuestionSchema,
  TCreateSingleMcqQuestionPayloadType,
} from "./questions.validations";
import type { IUser, IUserDoc } from "../User";
import { Passage } from "../Passage";
import { questionUtils } from "./question-utils";
import {
  MultipleChoiceMcqVersion,
  SingleMcqVersion,
} from "../QuestionVersion/question-version.model";

import mongoose from "mongoose";
import { extractCloudinaryImages } from "@/app/utils/extract-cloudinary-images";
import { mediaServices } from "../Media";
import type { IQuestionOption } from "./questions.interfaces";
import { questionVersionServices } from "../QuestionVersion";

// 1. CREATE SINGLE MCQ QUESTIONS
const createSingleMcqQuestion = async (
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
  questionUtils.validateByType(QUESTION_TYPE.SINGLE_MCQ, payload);

  // Check is passage exists ?:

  let existingPassage = null;

  if (passageId) {
    existingPassage = await Passage.findById(passageId);
    if (!existingPassage) {
      throw new NotFoundError("Passage not found.");
    }
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
    throw new ConflictError("The question with same options already exists.");
  }

  // Generate code:
  const code = await questionUtils.generateUniqueQuestionCode();
  const slug = questionUtils.generateSafeQuestionSlug(stem, code);
  const language = questionUtils.detectLanguage(stem);
  const planHtml = questionUtils.stripHtml(stem);

  // Check is the slug already in use:
  const duplicateSlug = await Question.exists({ slug });

  if (duplicateSlug) {
    throw new ConflictError(
      `Please try again with a new code/slug for this question.`,
    );
  }

  const mediaUrls = new Set<string>();

  if (mediaUrl) mediaUrls.add(mediaUrl);

  const contents: string[] = [stem];

  if (explanation) contents.push(explanation as string);
  options.forEach((opt) => {
    if (opt.content) contents.push(opt.content);
    if (opt.mediaUrl) mediaUrls.add(opt.mediaUrl);
  });

  const contentUrls = extractCloudinaryImages(contents);

  if (contentUrls.length > 0) {
    contentUrls.forEach((url) => mediaUrls.add(url));
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
      author: user._id,
    };

    const question = await Question.create([questionPayload], {
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

    if (mediaUrls.size > 0) {
      await mediaServices.attachImages(Array.from(mediaUrls));
    }

    await mongoSession.commitTransaction();

    return question?.[0];
  } catch (error) {
    if (mongoSession.inTransaction()) {
      await mongoSession.abortTransaction();
    }

    throw error;
  } finally {
    await mongoSession.endSession();
  }
};

// 2. CREATE MULTI MCQ QUESTION:
const createMultiMcqQuestion = async (
  user: IUserDoc,
  payload: TCreateMultiMcqQuestionSchema,
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
  questionUtils.validateByType(QUESTION_TYPE.MULTI_MCQ, payload);

  // Check is passage exists ?:

  let existingPassage = null;

  if (passageId) {
    existingPassage = await Passage.findById(passageId);
    if (!existingPassage) {
      throw new NotFoundError("Passage not found.");
    }
  }

  //  Hash content:
  const hashedContent = questionUtils.generateContentHash({
    type: QUESTION_TYPE.MULTI_MCQ,
    stem,
    options: options as IQuestionOption[],
  });

  //  Check hash already exists?:
  const duplicateContent =
    await questionVersionServices.checkDuplicateByHash(hashedContent);

  if (duplicateContent) {
    throw new ConflictError("The question with same options already exists.");
  }

  // Generate code:
  const code = await questionUtils.generateUniqueQuestionCode();
  const slug = questionUtils.generateSafeQuestionSlug(stem, code);
  const language = questionUtils.detectLanguage(stem);
  const planHtml = questionUtils.stripHtml(stem);

  // Check is the slug already in use:
  const duplicateSlug = await Question.exists({ slug });

  if (duplicateSlug) {
    throw new ConflictError(
      `Please try again with a new code/slug for this question.`,
    );
  }

  const mediaUrls = new Set<string>();

  if (mediaUrl) mediaUrls.add(mediaUrl);

  const contents: string[] = [stem];

  if (explanation) contents.push(explanation as string);
  options.forEach((opt) => {
    if (opt.content) contents.push(opt.content);
    if (opt.mediaUrl) mediaUrls.add(opt.mediaUrl);
  });

  const contentUrls = extractCloudinaryImages(contents);

  if (contentUrls.length > 0) {
    contentUrls.forEach((url) => mediaUrls.add(url));
  }

  // Session :
  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    //  Create the question:

    const questionPayload = {
      code,
      slug,
      type: QUESTION_TYPE.MULTI_MCQ,
      difficulty: difficulty || "medium",
      status: QUESTION_STATUS.DRAFT,
      passageId: existingPassage?._id || undefined,
      isFlagged: false,
      author: user._id,
    };

    const question = await Question.create([questionPayload], {
      session: mongoSession,
    });

    if (!question?.[0]) {
      throw new ConflictError("Failed to create question");
    }

    // Create version
    const multiMcqVersionPayload = {
      type: QUESTION_TYPE.MULTI_MCQ,
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

    const version = await MultipleChoiceMcqVersion.create(
      [multiMcqVersionPayload],
      {
        session: mongoSession,
      },
    );

    if (!version?.[0]) {
      throw new ConflictError("Failed to create question version");
    }

    if (mediaUrls.size > 0) {
      await mediaServices.attachImages(Array.from(mediaUrls));
    }

    await mongoSession.commitTransaction();

    return question?.[0];
  } catch (error) {
    if (mongoSession.inTransaction()) {
      await mongoSession.abortTransaction();
    }

    throw error;
  } finally {
    await mongoSession.endSession();
  }
};

// 3.  CREATE TRUE_FALSE QUESTION:

export const questionsServices = {
  createSingleMcqQuestion,
  createMultiMcqQuestion,
};

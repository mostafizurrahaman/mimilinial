import httpStatus from "http-status";
import type { PipelineStage } from "mongoose";

import {
  AppError,
  BadRequest,
  ConflictError,
  NotFoundError,
} from "../../errors";
import { Question } from "./questions.model";
import {
  QUESTION_STATUS,
  QUESTION_TYPE,
  questionsSearchableFields,
} from "./questions.constants";
import type {
  TCreateFillBlankQuestionPayloadType,
  TCreateMatchingQuestionPayloadType,
  TCreateMultiMcqQuestionSchema,
  TCreateOrderingQuestionPayloadType,
  TCreateSingleMcqQuestionPayloadType,
  TCreateTrueFalseQuestionPayloadType,
} from "./questions.validations";
import type { IUser, IUserDoc } from "../User";
import { Passage } from "../Passage";
import { questionUtils } from "./question-utils";
import {
  FillBlankQuestionVersion,
  MatchingPairQuestionVersion,
  MultipleChoiceMcqVersion,
  OrderingQuestionVersion,
  SingleMcqVersion,
  TrueFalseMcqVersion,
} from "../QuestionVersion/question-version.model";

import mongoose from "mongoose";
import { extractCloudinaryImages } from "@/app/utils/extract-cloudinary-images";
import { mediaServices } from "../Media";
import type {
  IMatchingPair,
  IOrderingItem,
  IQuestionOption,
} from "./questions.interfaces";
import { questionVersionServices } from "../QuestionVersion";
import { getPublicId } from "@/app/utils/cloudinary/delete-file";

/**
 * Safely attach Cloudinary media URLs without throwing if non-Cloudinary URLs are present
 */
const attachCloudinaryMedia = async (mediaUrls: Set<string>) => {
  const validCloudinaryUrls = Array.from(mediaUrls).filter((url) => {
    try {
      return !!getPublicId(url);
    } catch {
      return false;
    }
  });

  if (validCloudinaryUrls.length > 0) {
    await mediaServices.attachImages(validCloudinaryUrls);
  }
};

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

  // Validate the question:
  questionUtils.validateByType(QUESTION_TYPE.SINGLE_MCQ, payload);

  // Check if passage exists:
  let existingPassage = null;

  if (passageId) {
    existingPassage = await Passage.findById(passageId);
    if (!existingPassage) {
      throw new NotFoundError("Passage not found.");
    }
  }

  // Hash content:
  const hashedContent = questionUtils.generateContentHash({
    type: QUESTION_TYPE.SINGLE_MCQ,
    stem,
    options: options as IQuestionOption[],
  });

  // Check hash already exists?:
  const duplicateContent =
    await questionVersionServices.checkDuplicateByHash(hashedContent);

  if (duplicateContent) {
    throw new ConflictError("The question with same options already exists.");
  }

  // Generate code:
  const code = await questionUtils.generateUniqueQuestionCode("SMCQ");
  const slug = questionUtils.generateSafeQuestionSlug(stem, code);
  const language = questionUtils.detectLanguage(stem);
  const planHtml = questionUtils.stripHtml(stem);

  // Check if the slug already in use:
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

    // Create the question:
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
      explanation: explanation || null,
      changeLog,
      mediaUrl: mediaUrl || null,
      author: user._id,
    };

    const version = await SingleMcqVersion.create([singleMcqVersionPayload], {
      session: mongoSession,
    });

    if (!version?.[0]) {
      throw new ConflictError("Failed to create question version");
    }

    await attachCloudinaryMedia(mediaUrls);

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

  // Validate the question:
  questionUtils.validateByType(QUESTION_TYPE.MULTI_MCQ, payload);

  // Check if passage exists:
  let existingPassage = null;

  if (passageId) {
    existingPassage = await Passage.findById(passageId);
    if (!existingPassage) {
      throw new NotFoundError("Passage not found.");
    }
  }

  // Hash content:
  const hashedContent = questionUtils.generateContentHash({
    type: QUESTION_TYPE.MULTI_MCQ,
    stem,
    options: options as IQuestionOption[],
  });

  // Check hash already exists?:
  const duplicateContent =
    await questionVersionServices.checkDuplicateByHash(hashedContent);

  if (duplicateContent) {
    throw new ConflictError("The question with same options already exists.");
  }

  // Generate code:
  const code = await questionUtils.generateUniqueQuestionCode("MMCQ");
  const slug = questionUtils.generateSafeQuestionSlug(stem, code);
  const language = questionUtils.detectLanguage(stem);
  const planHtml = questionUtils.stripHtml(stem);

  // Check if the slug already in use:
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

    // Create the question:
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
      explanation: explanation || null,
      changeLog,
      mediaUrl: mediaUrl || null,
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

    await attachCloudinaryMedia(mediaUrls);

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

// 3. CREATE TRUE_FALSE QUESTION:
const createTrueFalseQuestion = async (
  user: IUserDoc,
  payload: TCreateTrueFalseQuestionPayloadType,
) => {
  const {
    passageId,
    stem,
    options,
    explanation,
    changeLog,
    difficulty,
    mediaUrl,
  } = payload;

  // Validate the question:
  questionUtils.validateByType(QUESTION_TYPE.TRUE_FALSE, payload);

  // Check if passage exists:
  let existingPassage = null;

  if (passageId) {
    existingPassage = await Passage.findById(passageId);
    if (!existingPassage) {
      throw new NotFoundError("Passage not found.");
    }
  }

  // Hash content:
  const hashedContent = questionUtils.generateContentHash({
    type: QUESTION_TYPE.TRUE_FALSE,
    stem,
    options: options as IQuestionOption[],
  });

  // Check duplicate hash:
  const duplicateContent =
    await questionVersionServices.checkDuplicateByHash(hashedContent);

  if (duplicateContent) {
    throw new ConflictError("The question with same options already exists.");
  }

  // Generate unique code & slug:
  const code = await questionUtils.generateUniqueQuestionCode("TF");
  const slug = questionUtils.generateSafeQuestionSlug(stem, code);
  const language = questionUtils.detectLanguage(stem);
  const planHtml = questionUtils.stripHtml(stem);

  // Check duplicate slug:
  const duplicateSlug = await Question.exists({ slug });

  if (duplicateSlug) {
    throw new ConflictError(
      `Please try again with a new code/slug for this question.`,
    );
  }

  // Collect media URLs:
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

  // Session:
  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    const questionPayload = {
      code,
      slug,
      type: QUESTION_TYPE.TRUE_FALSE,
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

    const trueFalseVersionPayload = {
      type: QUESTION_TYPE.TRUE_FALSE,
      question: question[0]._id,
      versionNumber: 1,
      isCurrent: true,
      stem,
      planStem: planHtml,
      options: options as IQuestionOption[],
      contentHash: hashedContent,
      language,
      explanation: explanation || null,
      changeLog,
      mediaUrl: mediaUrl || null,
      author: user._id,
    };

    const version = await TrueFalseMcqVersion.create(
      [trueFalseVersionPayload],
      {
        session: mongoSession,
      },
    );

    if (!version?.[0]) {
      throw new ConflictError("Failed to create question version");
    }

    await attachCloudinaryMedia(mediaUrls);

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

// 4. CREATE FILL IN THE BLANK QUESTION:
const createFillBlankQuestion = async (
  user: IUserDoc,
  payload: TCreateFillBlankQuestionPayloadType,
) => {
  const {
    passageId,
    stem,
    acceptedAnswers,
    isCaseSensitive,
    explanation,
    changeLog,
    difficulty,
    mediaUrl,
  } = payload;

  // Validate the question:
  questionUtils.validateByType(QUESTION_TYPE.FILL_BLANK, payload);

  // Check if passage exists:
  let existingPassage = null;

  if (passageId) {
    existingPassage = await Passage.findById(passageId);
    if (!existingPassage) {
      throw new NotFoundError("Passage not found.");
    }
  }

  if (!stem?.includes("___")) {
    throw new BadRequest(
      "Fill-in-the-gap question stem must contain at least one blank (___).",
    );
  }

  // Hash content:
  const hashedContent = questionUtils.generateContentHash({
    type: QUESTION_TYPE.FILL_BLANK,
    stem,
    acceptedAnswers,
  });

  // Check duplicate hash:
  const duplicateContent =
    await questionVersionServices.checkDuplicateByHash(hashedContent);

  if (duplicateContent) {
    throw new ConflictError(
      "The question with same accepted answers already exists.",
    );
  }

  // Generate unique code & slug:
  const code = await questionUtils.generateUniqueQuestionCode("FITB");
  const slug = questionUtils.generateSafeQuestionSlug(stem, code);
  const language = questionUtils.detectLanguage(stem);
  const planHtml = questionUtils.stripHtml(stem);

  // Check duplicate slug:
  const duplicateSlug = await Question.exists({ slug });

  if (duplicateSlug) {
    throw new ConflictError(
      `Please try again with a new code/slug for this question.`,
    );
  }

  // Collect media URLs:
  const mediaUrls = new Set<string>();

  if (mediaUrl) mediaUrls.add(mediaUrl);

  const contents: string[] = [stem];

  if (explanation) contents.push(explanation as string);

  const contentUrls = extractCloudinaryImages(contents);

  if (contentUrls.length > 0) {
    contentUrls.forEach((url) => mediaUrls.add(url));
  }

  // Session:
  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    const questionPayload = {
      code,
      slug,
      type: QUESTION_TYPE.FILL_BLANK,
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

    const fillBlankVersionPayload = {
      type: QUESTION_TYPE.FILL_BLANK,
      question: question[0]._id,
      versionNumber: 1,
      isCurrent: true,
      stem,
      planStem: planHtml,
      acceptedAnswers,
      isCaseSensitive: !!isCaseSensitive,
      contentHash: hashedContent,
      language,
      explanation: explanation || null,
      changeLog,
      mediaUrl: mediaUrl || null,
      author: user._id,
    };

    const version = await FillBlankQuestionVersion.create(
      [fillBlankVersionPayload],
      {
        session: mongoSession,
      },
    );

    if (!version?.[0]) {
      throw new ConflictError("Failed to create question version");
    }

    await attachCloudinaryMedia(mediaUrls);

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

// 5. CREATE MATCHING QUESTION:
const createMatchingQuestion = async (
  user: IUserDoc,
  payload: TCreateMatchingQuestionPayloadType,
) => {
  const {
    passageId,
    stem,
    pairs,
    explanation,
    changeLog,
    difficulty,
    mediaUrl,
  } = payload;

  // Validate the question:
  questionUtils.validateByType(QUESTION_TYPE.MATCHING, payload);

  // Check if passage exists:
  let existingPassage = null;

  if (passageId) {
    existingPassage = await Passage.findById(passageId);
    if (!existingPassage) {
      throw new NotFoundError("Passage not found.");
    }
  }

  // Hash content:
  const hashedContent = questionUtils.generateContentHash({
    type: QUESTION_TYPE.MATCHING,
    stem,
    pairs: pairs as IMatchingPair[],
  });

  // Check duplicate hash:
  const duplicateContent =
    await questionVersionServices.checkDuplicateByHash(hashedContent);

  if (duplicateContent) {
    throw new ConflictError(
      "The question with same matching pairs already exists.",
    );
  }

  // Generate unique code & slug:
  const code = await questionUtils.generateUniqueQuestionCode("MAT");
  const slug = questionUtils.generateSafeQuestionSlug(stem, code);
  const language = questionUtils.detectLanguage(stem);
  const planHtml = questionUtils.stripHtml(stem);

  // Check duplicate slug:
  const duplicateSlug = await Question.exists({ slug });

  if (duplicateSlug) {
    throw new ConflictError(
      `Please try again with a new code/slug for this question.`,
    );
  }

  // Collect media URLs:
  const mediaUrls = new Set<string>();

  if (mediaUrl) mediaUrls.add(mediaUrl);

  const contents: string[] = [stem];

  if (explanation) contents.push(explanation as string);
  pairs.forEach((p) => {
    if (p.left) contents.push(p.left);
    if (p.right) contents.push(p.right);
  });

  const contentUrls = extractCloudinaryImages(contents);

  if (contentUrls.length > 0) {
    contentUrls.forEach((url) => mediaUrls.add(url));
  }

  // Session:
  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    const questionPayload = {
      code,
      slug,
      type: QUESTION_TYPE.MATCHING,
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

    const matchingVersionPayload = {
      type: QUESTION_TYPE.MATCHING,
      question: question[0]._id,
      versionNumber: 1,
      isCurrent: true,
      stem,
      planStem: planHtml,
      pairs: pairs as IMatchingPair[],
      contentHash: hashedContent,
      language,
      explanation: explanation || null,
      changeLog,
      mediaUrl: mediaUrl || null,
      author: user._id,
    };

    const version = await MatchingPairQuestionVersion.create(
      [matchingVersionPayload],
      {
        session: mongoSession,
      },
    );

    if (!version?.[0]) {
      throw new ConflictError("Failed to create question version");
    }

    await attachCloudinaryMedia(mediaUrls);

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

// 6. CREATE ORDERING QUESTION:
const createOrderingQuestion = async (
  user: IUserDoc,
  payload: TCreateOrderingQuestionPayloadType,
) => {
  const {
    passageId,
    stem,
    orderingItems,
    explanation,
    changeLog,
    difficulty,
    mediaUrl,
  } = payload;

  // Validate the question:
  questionUtils.validateByType(QUESTION_TYPE.ORDERING, payload);

  // Check if passage exists:
  let existingPassage = null;

  if (passageId) {
    existingPassage = await Passage.findById(passageId);
    if (!existingPassage) {
      throw new NotFoundError("Passage not found.");
    }
  }

  // Hash content:
  const hashedContent = questionUtils.generateContentHash({
    type: QUESTION_TYPE.ORDERING,
    stem,
    orderingItems: orderingItems as IOrderingItem[],
  });

  // Check duplicate hash:
  const duplicateContent =
    await questionVersionServices.checkDuplicateByHash(hashedContent);

  if (duplicateContent) {
    throw new ConflictError(
      "The question with same ordering items already exists.",
    );
  }

  // Generate unique code & slug:
  const code = await questionUtils.generateUniqueQuestionCode("ORD");
  const slug = questionUtils.generateSafeQuestionSlug(stem, code);
  const language = questionUtils.detectLanguage(stem);
  const planHtml = questionUtils.stripHtml(stem);

  // Check duplicate slug:
  const duplicateSlug = await Question.exists({ slug });

  if (duplicateSlug) {
    throw new ConflictError(
      `Please try again with a new code/slug for this question.`,
    );
  }

  // Collect media URLs:
  const mediaUrls = new Set<string>();

  if (mediaUrl) mediaUrls.add(mediaUrl);

  const contents: string[] = [stem];

  if (explanation) contents.push(explanation as string);
  orderingItems.forEach((item) => {
    if (item.text) contents.push(item.text);
  });

  const contentUrls = extractCloudinaryImages(contents);

  if (contentUrls.length > 0) {
    contentUrls.forEach((url) => mediaUrls.add(url));
  }

  // Session:
  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    const questionPayload = {
      code,
      slug,
      type: QUESTION_TYPE.ORDERING,
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

    const orderingVersionPayload = {
      type: QUESTION_TYPE.ORDERING,
      question: question[0]._id,
      versionNumber: 1,
      isCurrent: true,
      stem,
      planStem: planHtml,
      orderingItems: orderingItems as IOrderingItem[],
      contentHash: hashedContent,
      language,
      explanation: explanation || null,
      changeLog,
      mediaUrl: mediaUrl || null,
      author: user._id,
    };

    const version = await OrderingQuestionVersion.create(
      [orderingVersionPayload],
      {
        session: mongoSession,
      },
    );

    if (!version?.[0]) {
      throw new ConflictError("Failed to create question version");
    }

    await attachCloudinaryMedia(mediaUrls);

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

export const questionsServices = {
  createSingleMcqQuestion,
  createMultiMcqQuestion,
  createTrueFalseQuestion,
  createFillBlankQuestion,
  createMatchingQuestion,
  createOrderingQuestion,
};

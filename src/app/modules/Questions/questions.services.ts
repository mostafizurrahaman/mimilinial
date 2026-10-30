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
  questionProjections,
  questionsSearchableFields,
  questionsSortableFields,
} from "./questions.constants";
import type {
  TCreateFillBlankQuestionPayloadType,
  TCreateMatchingQuestionPayloadType,
  TCreateMultiMcqQuestionSchema,
  TCreateOrderingQuestionPayloadType,
  TCreateSingleMcqQuestionPayloadType,
  TCreateTrueFalseQuestionPayloadType,
  TGetAllQuestionQueryType,
  TGetQuestionByIDQueryType,
  TUpdateFillBlankQuestionPayloadType,
  TUpdateMatchingQuestionPayloadType,
  TUpdateMultiMcqQuestionPayloadType,
  TUpdateOrderingQuestionPayloadType,
  TUpdateSingleMcqQuestionPayloadType,
  TUpdateTrueFalseQuestionPayloadType,
} from "./questions.validations";
import type { IUser, IUserDoc } from "../User";
import { Passage, PASSAGE_STATUS } from "../Passage";
import { questionUtils } from "./question-utils";
import {
  FillBlankQuestionVersion,
  MatchingPairQuestionVersion,
  MultipleChoiceMcqVersion,
  OrderingQuestionVersion,
  QuestionVersion,
  SingleMcqVersion,
  TrueFalseMcqVersion,
} from "../QuestionVersion/question-version.model";

import mongoose, { Types } from "mongoose";
import { extractCloudinaryImages } from "@/app/utils/extract-cloudinary-images";
import { mediaServices } from "../Media";
import type {
  IMatchingPair,
  IOrderingItem,
  IQuestion,
  IQuestionOption,
  IQuestionVersion,
} from "./questions.interfaces";
import { questionVersionServices } from "../QuestionVersion";
import { getPublicId } from "@/app/utils/cloudinary/delete-file";
import { formatQuery } from "@/app/utils";
import moment from "moment";

/**
 * Safely attach Cloudinary media URLs without throwing if non-Cloudinary URLs are present
 */
const attachCloudinaryMedia = async (
  mediaUrls: Set<string> | string[],
  entity?: { entityType: string; entityId: mongoose.Types.ObjectId | string },
) => {
  const validCloudinaryUrls = Array.from(mediaUrls).filter((url) => {
    try {
      return !!getPublicId(url);
    } catch {
      return false;
    }
  });

  if (validCloudinaryUrls.length > 0) {
    await mediaServices.attachImages(validCloudinaryUrls, entity);
  }
};

/**
 * Safely unattach Cloudinary media URLs without throwing if non-Cloudinary URLs are present
 */
const unattachCloudinaryMedia = async (
  mediaUrls: Set<string> | string[],
  entity?: { entityType: string; entityId: mongoose.Types.ObjectId | string },
) => {
  const validCloudinaryUrls = Array.from(mediaUrls).filter((url) => {
    try {
      return !!getPublicId(url);
    } catch {
      return false;
    }
  });

  if (validCloudinaryUrls.length > 0) {
    await mediaServices.unattachImages(validCloudinaryUrls, entity);
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

    if (existingPassage.status !== PASSAGE_STATUS.PUBLISHED) {
      throw new BadRequest(
        `Cannot attach question to a ${existingPassage.status} passage. The passage must be published first.`,
      );
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

    await attachCloudinaryMedia(mediaUrls, {
      entityType: "Question",
      entityId: question[0]._id,
    });

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

    if (existingPassage.status !== PASSAGE_STATUS.PUBLISHED) {
      throw new BadRequest(
        `Cannot attach question to a ${existingPassage.status} passage. The passage must be published first.`,
      );
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

    await attachCloudinaryMedia(mediaUrls, {
      entityType: "Question",
      entityId: question[0]._id,
    });

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
    if (existingPassage.status !== PASSAGE_STATUS.PUBLISHED) {
      throw new BadRequest(
        `Cannot attach question to a ${existingPassage.status} passage. The passage must be published first.`,
      );
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

    await attachCloudinaryMedia(mediaUrls, {
      entityType: "Question",
      entityId: question[0]._id,
    });

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
    if (existingPassage.status !== PASSAGE_STATUS.PUBLISHED) {
      throw new BadRequest(
        `Cannot attach question to a ${existingPassage.status} passage. The passage must be published first.`,
      );
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

    await attachCloudinaryMedia(mediaUrls, {
      entityType: "Question",
      entityId: question[0]._id,
    });

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
    if (existingPassage.status !== PASSAGE_STATUS.PUBLISHED) {
      throw new BadRequest(
        `Cannot attach question to a ${existingPassage.status} passage. The passage must be published first.`,
      );
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

    await attachCloudinaryMedia(mediaUrls, {
      entityType: "Question",
      entityId: question[0]._id,
    });

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
    if (existingPassage.status !== PASSAGE_STATUS.PUBLISHED) {
      throw new BadRequest(
        `Cannot attach question to a ${existingPassage.status} passage. The passage must be published first.`,
      );
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

    await attachCloudinaryMedia(mediaUrls, {
      entityType: "Question",
      entityId: question[0]._id,
    });

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

// 7. UPDATE SINGLE MCQ QUESTIONS
const updateSingleMcqQuestion = async (
  id: string,
  user: IUserDoc,
  payload: TUpdateSingleMcqQuestionPayloadType,
) => {
  const {
    // related to question:
    passageId,
    difficulty,

    // Related to version
    stem,
    options,
    explanation,
    changeLog,
    mediaUrl,
  } = payload;

  // 1. Find the main question:
  const question = await Question.findById(id);
  if (!question) {
    throw new NotFoundError("Question not found.");
  }

  // 1.1. Check Question:
  if (question.type !== QUESTION_TYPE.SINGLE_MCQ) {
    throw new BadRequest(
      `Question type mismatch. Expected ${QUESTION_TYPE.SINGLE_MCQ}, got ${question.type}.`,
    );
  }

  // 2. If question status is archived, don't allow to edit:
  if (question.status === QUESTION_STATUS.ARCHIVED) {
    throw new BadRequest("Cannot update an archived question.");
  }

  // 3. Check  is passage updated ?:
  let existingPassage = null;
  if (passageId !== undefined) {
    if (passageId) {
      existingPassage = await Passage.findById(passageId);
      if (!existingPassage) {
        throw new NotFoundError("Passage not found.");
      }

      if (existingPassage.status !== PASSAGE_STATUS.PUBLISHED) {
        throw new BadRequest(
          `Cannot attach question to a ${existingPassage.status} passage. The passage must be published first.`,
        );
      }
    }
  }

  // 4. Check the current version:
  const currentVersion = await SingleMcqVersion.findOne({
    question: question._id,
    isCurrent: true,
  });

  if (!currentVersion) {
    throw new NotFoundError("Active question version not found.");
  }

  const newStem = stem ?? currentVersion.stem;
  const newOptions = (options as IQuestionOption[]) ?? currentVersion.options;
  const newExplanation =
    explanation !== undefined ? explanation : currentVersion.explanation;
  const newMediaUrl =
    mediaUrl !== undefined ? mediaUrl : currentVersion.mediaUrl;
  const newDifficulty = difficulty ?? question.difficulty;

  // Check if version content changed:
  const isVersionChanged = questionUtils.hasVersionContentChanged({
    type: QUESTION_TYPE.SINGLE_MCQ,
    currentVersion,
    newStem,
    newOptions,
    newExplanation,
    newMediaUrl,
  });

  // Check if question metadata changed:
  const isQuestionChanged = questionUtils.hasQuestionMetadataChanged({
    currentDifficulty: question.difficulty,
    newDifficulty: difficulty,
    currentPassageId: question.passageId,
    targetPassageId: existingPassage?._id,
    isPassageProvided: passageId !== undefined,
  });

  if (!isVersionChanged && !isQuestionChanged) {
    throw new BadRequest("No changes detected in question or version content.");
  }

  // Validate single MCQ options
  questionUtils.validateSingleMcqOptions(newOptions);

  const hashedContent = questionUtils.generateContentHash({
    type: QUESTION_TYPE.SINGLE_MCQ,
    stem: newStem,
    options: newOptions,
  });

  const duplicateContent =
    await questionVersionServices.checkDuplicateByHash(hashedContent);

  if (
    duplicateContent &&
    duplicateContent.question?._id?.toString() !== question._id.toString()
  ) {
    throw new ConflictError("The question with same options already exists.");
  }

  const language = questionUtils.detectLanguage(newStem);
  const planHtml = questionUtils.stripHtml(newStem);

  let newSlug = question.slug;
  if (stem && stem !== currentVersion.stem) {
    newSlug = questionUtils.generateSafeQuestionSlug(newStem, question.code);
    const duplicateSlug = await Question.exists({
      slug: newSlug,
      _id: { $ne: question._id },
    });
    if (duplicateSlug) {
      throw new ConflictError(
        "Slug collision occurred for this question stem.",
      );
    }
  }

  const previousMediaUrls =
    questionUtils.extractMediaUrlsFromVersion(currentVersion);

  const mediaUrls = new Set<string>();
  if (newMediaUrl) mediaUrls.add(newMediaUrl);

  const contents: string[] = [newStem];
  if (newExplanation) contents.push(newExplanation as string);
  newOptions.forEach((opt) => {
    if (opt.content) contents.push(opt.content);
    if (opt.mediaUrl) mediaUrls.add(opt.mediaUrl);
  });

  const contentUrls = extractCloudinaryImages(contents);
  if (contentUrls.length > 0) {
    contentUrls.forEach((url) => mediaUrls.add(url));
  }

  const addedMediaUrls = Array.from(mediaUrls).filter(
    (url) => !previousMediaUrls.has(url),
  );

  const removedMediaUrls = Array.from(previousMediaUrls).filter(
    (url) => !mediaUrls.has(url),
  );

  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    question.difficulty = newDifficulty;
    if (passageId !== undefined) {
      question.passageId = existingPassage
        ? (existingPassage._id as mongoose.Types.ObjectId)
        : null;
    }
    question.slug = newSlug;
    await question.save({ session: mongoSession });

    if (question.status === QUESTION_STATUS.PUBLISHED) {
      if (isVersionChanged) {
        currentVersion.isCurrent = false;
        await currentVersion.save({ session: mongoSession });

        const newVersionNumber = currentVersion.versionNumber + 1;
        const newVersionPayload = {
          type: QUESTION_TYPE.SINGLE_MCQ,
          question: question._id,
          versionNumber: newVersionNumber,
          isCurrent: true,
          stem: newStem,
          planStem: planHtml,
          options: newOptions,
          contentHash: hashedContent,
          language,
          explanation: newExplanation || null,
          changeLog: changeLog || `Updated to version ${newVersionNumber}`,
          mediaUrl: newMediaUrl || null,
          author: user._id,
        };

        const newVersion = await SingleMcqVersion.create([newVersionPayload], {
          session: mongoSession,
        });

        if (!newVersion?.[0]) {
          throw new ConflictError("Failed to create question version");
        }
      }
    } else {
      if (isVersionChanged) {
        currentVersion.stem = newStem;
        currentVersion.plainStem = planHtml;
        currentVersion.options = newOptions;
        currentVersion.contentHash = hashedContent;
        currentVersion.language = language;
        currentVersion.explanation = newExplanation || null;
        currentVersion.mediaUrl = newMediaUrl || null;
        if (changeLog) {
          currentVersion.changeLog = changeLog;
        }
        currentVersion.author = user._id;
        await currentVersion.save({ session: mongoSession });
      }
    }

    if (addedMediaUrls.length > 0) {
      await attachCloudinaryMedia(addedMediaUrls, {
        entityType: "Question",
        entityId: question._id,
      });
    }

    if (
      question.status !== QUESTION_STATUS.PUBLISHED &&
      removedMediaUrls.length > 0
    ) {
      await unattachCloudinaryMedia(removedMediaUrls, {
        entityType: "Question",
        entityId: question._id,
      });
    }

    await mongoSession.commitTransaction();

    return question;
  } catch (error) {
    if (mongoSession.inTransaction()) {
      await mongoSession.abortTransaction();
    }
    throw error;
  } finally {
    await mongoSession.endSession();
  }
};

// 8. UPDATE MULTI MCQ QUESTIONS
const updateMultiMcqQuestion = async (
  id: string,
  user: IUserDoc,
  payload: TUpdateMultiMcqQuestionPayloadType,
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

  const question = await Question.findById(id);
  if (!question) {
    throw new NotFoundError("Question not found.");
  }

  if (question.type !== QUESTION_TYPE.MULTI_MCQ) {
    throw new BadRequest(
      `Question type mismatch. Expected ${QUESTION_TYPE.MULTI_MCQ}, got ${question.type}.`,
    );
  }

  if (question.status === QUESTION_STATUS.ARCHIVED) {
    throw new BadRequest("Cannot update an archived question.");
  }

  let existingPassage = null;
  if (passageId !== undefined) {
    if (passageId) {
      existingPassage = await Passage.findById(passageId);
      if (!existingPassage) {
        throw new NotFoundError("Passage not found.");
      }

      if (existingPassage.status !== PASSAGE_STATUS.PUBLISHED) {
        throw new BadRequest(
          `Cannot attach question to a ${existingPassage.status} passage. The passage must be published first.`,
        );
      }
    }
  }

  const currentVersion = await MultipleChoiceMcqVersion.findOne({
    question: question._id,
    isCurrent: true,
  });

  if (!currentVersion) {
    throw new NotFoundError("Active question version not found.");
  }

  const newStem = stem ?? currentVersion.stem;
  const newOptions = (options as IQuestionOption[]) ?? currentVersion.options;
  const newExplanation =
    explanation !== undefined ? explanation : currentVersion.explanation;
  const newMediaUrl =
    mediaUrl !== undefined ? mediaUrl : currentVersion.mediaUrl;
  const newDifficulty = difficulty ?? question.difficulty;

  // Check if version content changed:
  const isVersionChanged = questionUtils.hasVersionContentChanged({
    type: QUESTION_TYPE.MULTI_MCQ,
    currentVersion,
    newStem,
    newOptions,
    newExplanation,
    newMediaUrl,
  });

  // Check if question metadata changed:
  const isQuestionChanged = questionUtils.hasQuestionMetadataChanged({
    currentDifficulty: question.difficulty,
    newDifficulty: difficulty,
    currentPassageId: question.passageId,
    targetPassageId: existingPassage?._id,
    isPassageProvided: passageId !== undefined,
  });

  if (!isVersionChanged && !isQuestionChanged) {
    throw new BadRequest("No changes detected in question or version content.");
  }

  // Validate multi MCQ options
  questionUtils.validateMultiMcqOptions(newOptions);

  const hashedContent = questionUtils.generateContentHash({
    type: QUESTION_TYPE.MULTI_MCQ,
    stem: newStem,
    options: newOptions,
  });

  const duplicateContent =
    await questionVersionServices.checkDuplicateByHash(hashedContent);

  if (
    duplicateContent &&
    duplicateContent.question?._id?.toString() !== question._id.toString()
  ) {
    throw new ConflictError("The question with same options already exists.");
  }

  const language = questionUtils.detectLanguage(newStem);
  const planHtml = questionUtils.stripHtml(newStem);

  let newSlug = question.slug;
  if (stem && stem !== currentVersion.stem) {
    newSlug = questionUtils.generateSafeQuestionSlug(newStem, question.code);
    const duplicateSlug = await Question.exists({
      slug: newSlug,
      _id: { $ne: question._id },
    });
    if (duplicateSlug) {
      throw new ConflictError(
        "Slug collision occurred for this question stem.",
      );
    }
  }

  const previousMediaUrls =
    questionUtils.extractMediaUrlsFromVersion(currentVersion);

  const mediaUrls = new Set<string>();
  if (newMediaUrl) mediaUrls.add(newMediaUrl);

  const contents: string[] = [newStem];
  if (newExplanation) contents.push(newExplanation as string);
  newOptions.forEach((opt) => {
    if (opt.content) contents.push(opt.content);
    if (opt.mediaUrl) mediaUrls.add(opt.mediaUrl);
  });

  const contentUrls = extractCloudinaryImages(contents);
  if (contentUrls.length > 0) {
    contentUrls.forEach((url) => mediaUrls.add(url));
  }

  const addedMediaUrls = Array.from(mediaUrls).filter(
    (url) => !previousMediaUrls.has(url),
  );

  const removedMediaUrls = Array.from(previousMediaUrls).filter(
    (url) => !mediaUrls.has(url),
  );

  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    question.difficulty = newDifficulty;
    if (passageId !== undefined) {
      question.passageId = existingPassage
        ? (existingPassage._id as mongoose.Types.ObjectId)
        : null;
    }
    question.slug = newSlug;
    await question.save({ session: mongoSession });

    if (question.status === QUESTION_STATUS.PUBLISHED) {
      if (isVersionChanged) {
        currentVersion.isCurrent = false;
        await currentVersion.save({ session: mongoSession });

        const newVersionNumber = currentVersion.versionNumber + 1;
        const newVersionPayload = {
          type: QUESTION_TYPE.MULTI_MCQ,
          question: question._id,
          versionNumber: newVersionNumber,
          isCurrent: true,
          stem: newStem,
          planStem: planHtml,
          options: newOptions,
          contentHash: hashedContent,
          language,
          explanation: newExplanation || null,
          changeLog: changeLog || `Updated to version ${newVersionNumber}`,
          mediaUrl: newMediaUrl || null,
          author: user._id,
        };

        const newVersion = await MultipleChoiceMcqVersion.create(
          [newVersionPayload],
          { session: mongoSession },
        );

        if (!newVersion?.[0]) {
          throw new ConflictError("Failed to create question version");
        }
      }
    } else {
      if (isVersionChanged) {
        currentVersion.stem = newStem;
        currentVersion.plainStem = planHtml;
        currentVersion.options = newOptions;
        currentVersion.contentHash = hashedContent;
        currentVersion.language = language;
        currentVersion.explanation = newExplanation || null;
        currentVersion.mediaUrl = newMediaUrl || null;
        if (changeLog) {
          currentVersion.changeLog = changeLog;
        }
        currentVersion.author = user._id;
        await currentVersion.save({ session: mongoSession });
      }
    }

    if (addedMediaUrls.length > 0) {
      await attachCloudinaryMedia(addedMediaUrls, {
        entityType: "Question",
        entityId: question._id,
      });
    }

    if (
      question.status !== QUESTION_STATUS.PUBLISHED &&
      removedMediaUrls.length > 0
    ) {
      await unattachCloudinaryMedia(removedMediaUrls, {
        entityType: "Question",
        entityId: question._id,
      });
    }

    await mongoSession.commitTransaction();

    return question;
  } catch (error) {
    if (mongoSession.inTransaction()) {
      await mongoSession.abortTransaction();
    }
    throw error;
  } finally {
    await mongoSession.endSession();
  }
};

// 9. UPDATE TRUE FALSE QUESTIONS
const updateTrueFalseQuestion = async (
  id: string,
  user: IUserDoc,
  payload: TUpdateTrueFalseQuestionPayloadType,
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

  const question = await Question.findById(id);
  if (!question) {
    throw new NotFoundError("Question not found.");
  }

  if (question.type !== QUESTION_TYPE.TRUE_FALSE) {
    throw new BadRequest(
      `Question type mismatch. Expected ${QUESTION_TYPE.TRUE_FALSE}, got ${question.type}.`,
    );
  }

  if (question.status === QUESTION_STATUS.ARCHIVED) {
    throw new BadRequest("Cannot update an archived question.");
  }

  let existingPassage = null;
  if (passageId !== undefined) {
    if (passageId) {
      existingPassage = await Passage.findById(passageId);
      if (!existingPassage) {
        throw new NotFoundError("Passage not found.");
      }

      if (existingPassage.status !== PASSAGE_STATUS.PUBLISHED) {
        throw new BadRequest(
          `Cannot attach question to a ${existingPassage.status} passage. The passage must be published first.`,
        );
      }
    }
  }

  const currentVersion = await TrueFalseMcqVersion.findOne({
    question: question._id,
    isCurrent: true,
  });

  if (!currentVersion) {
    throw new NotFoundError("Active question version not found.");
  }

  const newStem = stem ?? currentVersion.stem;
  const newOptions = (options as IQuestionOption[]) ?? currentVersion.options;
  const newExplanation =
    explanation !== undefined ? explanation : currentVersion.explanation;
  const newMediaUrl =
    mediaUrl !== undefined ? mediaUrl : currentVersion.mediaUrl;
  const newDifficulty = difficulty ?? question.difficulty;

  // Check if version content changed:
  const isVersionChanged = questionUtils.hasVersionContentChanged({
    type: QUESTION_TYPE.TRUE_FALSE,
    currentVersion,
    newStem,
    newOptions,
    newExplanation,
    newMediaUrl,
  });

  // Check if question metadata changed:
  const isQuestionChanged = questionUtils.hasQuestionMetadataChanged({
    currentDifficulty: question.difficulty,
    newDifficulty: difficulty,
    currentPassageId: question.passageId,
    targetPassageId: existingPassage?._id,
    isPassageProvided: passageId !== undefined,
  });

  if (!isVersionChanged && !isQuestionChanged) {
    throw new BadRequest("No changes detected in question or version content.");
  }

  // Validate true/false options
  questionUtils.validateTrueFalseOptions(newOptions);

  const hashedContent = questionUtils.generateContentHash({
    type: QUESTION_TYPE.TRUE_FALSE,
    stem: newStem,
    options: newOptions,
  });

  const duplicateContent =
    await questionVersionServices.checkDuplicateByHash(hashedContent);

  if (
    duplicateContent &&
    duplicateContent.question?._id?.toString() !== question._id.toString()
  ) {
    throw new ConflictError("The question with same options already exists.");
  }

  const language = questionUtils.detectLanguage(newStem);
  const planHtml = questionUtils.stripHtml(newStem);

  let newSlug = question.slug;
  if (stem && stem !== currentVersion.stem) {
    newSlug = questionUtils.generateSafeQuestionSlug(newStem, question.code);
    const duplicateSlug = await Question.exists({
      slug: newSlug,
      _id: { $ne: question._id },
    });
    if (duplicateSlug) {
      throw new ConflictError(
        "Slug collision occurred for this question stem.",
      );
    }
  }

  const previousMediaUrls =
    questionUtils.extractMediaUrlsFromVersion(currentVersion);

  const mediaUrls = new Set<string>();
  if (newMediaUrl) mediaUrls.add(newMediaUrl);

  const contents: string[] = [newStem];
  if (newExplanation) contents.push(newExplanation as string);
  newOptions.forEach((opt) => {
    if (opt.content) contents.push(opt.content);
    if (opt.mediaUrl) mediaUrls.add(opt.mediaUrl);
  });

  const contentUrls = extractCloudinaryImages(contents);
  if (contentUrls.length > 0) {
    contentUrls.forEach((url) => mediaUrls.add(url));
  }

  const addedMediaUrls = Array.from(mediaUrls).filter(
    (url) => !previousMediaUrls.has(url),
  );

  const removedMediaUrls = Array.from(previousMediaUrls).filter(
    (url) => !mediaUrls.has(url),
  );

  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    question.difficulty = newDifficulty;
    if (passageId !== undefined) {
      question.passageId = existingPassage
        ? (existingPassage._id as mongoose.Types.ObjectId)
        : null;
    }
    question.slug = newSlug;
    await question.save({ session: mongoSession });

    if (question.status === QUESTION_STATUS.PUBLISHED) {
      if (isVersionChanged) {
        currentVersion.isCurrent = false;
        await currentVersion.save({ session: mongoSession });

        const newVersionNumber = currentVersion.versionNumber + 1;
        const newVersionPayload = {
          type: QUESTION_TYPE.TRUE_FALSE,
          question: question._id,
          versionNumber: newVersionNumber,
          isCurrent: true,
          stem: newStem,
          planStem: planHtml,
          options: newOptions,
          contentHash: hashedContent,
          language,
          explanation: newExplanation || null,
          changeLog: changeLog || `Updated to version ${newVersionNumber}`,
          mediaUrl: newMediaUrl || null,
          author: user._id,
        };

        const newVersion = await TrueFalseMcqVersion.create(
          [newVersionPayload],
          {
            session: mongoSession,
          },
        );

        if (!newVersion?.[0]) {
          throw new ConflictError("Failed to create question version");
        }
      }
    } else {
      if (isVersionChanged) {
        currentVersion.stem = newStem;
        currentVersion.plainStem = planHtml;
        currentVersion.options = newOptions;
        currentVersion.contentHash = hashedContent;
        currentVersion.language = language;
        currentVersion.explanation = newExplanation || null;
        currentVersion.mediaUrl = newMediaUrl || null;
        if (changeLog) {
          currentVersion.changeLog = changeLog;
        }
        currentVersion.author = user._id;
        await currentVersion.save({ session: mongoSession });
      }
    }

    if (addedMediaUrls.length > 0) {
      await attachCloudinaryMedia(addedMediaUrls, {
        entityType: "Question",
        entityId: question._id,
      });
    }

    if (
      question.status !== QUESTION_STATUS.PUBLISHED &&
      removedMediaUrls.length > 0
    ) {
      await unattachCloudinaryMedia(removedMediaUrls, {
        entityType: "Question",
        entityId: question._id,
      });
    }

    await mongoSession.commitTransaction();

    return question;
  } catch (error) {
    if (mongoSession.inTransaction()) {
      await mongoSession.abortTransaction();
    }
    throw error;
  } finally {
    await mongoSession.endSession();
  }
};

// 10. UPDATE FILL IN THE BLANK QUESTIONS
const updateFillBlankQuestion = async (
  id: string,
  user: IUserDoc,
  payload: TUpdateFillBlankQuestionPayloadType,
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

  const question = await Question.findById(id);
  if (!question) {
    throw new NotFoundError("Question not found.");
  }

  if (question.type !== QUESTION_TYPE.FILL_BLANK) {
    throw new BadRequest(
      `Question type mismatch. Expected ${QUESTION_TYPE.FILL_BLANK}, got ${question.type}.`,
    );
  }

  if (question.status === QUESTION_STATUS.ARCHIVED) {
    throw new BadRequest("Cannot update an archived question.");
  }

  let existingPassage = null;
  if (passageId !== undefined) {
    if (passageId) {
      existingPassage = await Passage.findById(passageId);
      if (!existingPassage) {
        throw new NotFoundError("Passage not found.");
      }
      if (existingPassage.status !== PASSAGE_STATUS.PUBLISHED) {
        throw new BadRequest(
          `Cannot attach question to a ${existingPassage.status} passage. The passage must be published first.`,
        );
      }
    }
  }

  const currentVersion = await FillBlankQuestionVersion.findOne({
    question: question._id,
    isCurrent: true,
  });

  if (!currentVersion) {
    throw new NotFoundError("Active question version not found.");
  }

  const newStem = stem ?? currentVersion.stem;
  const newAcceptedAnswers = acceptedAnswers ?? currentVersion.acceptedAnswers;
  const newIsCaseSensitive =
    isCaseSensitive !== undefined
      ? isCaseSensitive
      : currentVersion.isCaseSensitive;
  const newExplanation =
    explanation !== undefined ? explanation : currentVersion.explanation;
  const newMediaUrl =
    mediaUrl !== undefined ? mediaUrl : currentVersion.mediaUrl;
  const newDifficulty = difficulty ?? question.difficulty;

  // Check if version content changed:
  const isVersionChanged = questionUtils.hasVersionContentChanged({
    type: QUESTION_TYPE.FILL_BLANK,
    currentVersion,
    newStem,
    newAcceptedAnswers,
    newIsCaseSensitive,
    newExplanation,
    newMediaUrl,
  });

  // Check if question metadata changed:
  const isQuestionChanged = questionUtils.hasQuestionMetadataChanged({
    currentDifficulty: question.difficulty,
    newDifficulty: difficulty,
    currentPassageId: question.passageId,
    targetPassageId: existingPassage?._id,
    isPassageProvided: passageId !== undefined,
  });

  if (!isVersionChanged && !isQuestionChanged) {
    throw new BadRequest("No changes detected in question or version content.");
  }

  if (!newStem.includes("___")) {
    throw new BadRequest(
      "Fill-in-the-gap question stem must contain at least one blank (___).",
    );
  }

  // Validate fill-blank answers
  questionUtils.validateFillBlankAnswers(
    newAcceptedAnswers,
    newIsCaseSensitive,
  );

  const hashedContent = questionUtils.generateContentHash({
    type: QUESTION_TYPE.FILL_BLANK,
    stem: newStem,
    acceptedAnswers: newAcceptedAnswers,
  });

  const duplicateContent =
    await questionVersionServices.checkDuplicateByHash(hashedContent);

  if (
    duplicateContent &&
    duplicateContent.question?._id?.toString() !== question._id.toString()
  ) {
    throw new ConflictError("The question with same answers already exists.");
  }

  const language = questionUtils.detectLanguage(newStem);
  const planHtml = questionUtils.stripHtml(newStem);

  let newSlug = question.slug;
  if (stem && stem !== currentVersion.stem) {
    newSlug = questionUtils.generateSafeQuestionSlug(newStem, question.code);
    const duplicateSlug = await Question.exists({
      slug: newSlug,
      _id: { $ne: question._id },
    });
    if (duplicateSlug) {
      throw new ConflictError(
        "Slug collision occurred for this question stem.",
      );
    }
  }

  const previousMediaUrls =
    questionUtils.extractMediaUrlsFromVersion(currentVersion);

  const mediaUrls = new Set<string>();
  if (newMediaUrl) mediaUrls.add(newMediaUrl);

  const contents: string[] = [newStem];
  if (newExplanation) contents.push(newExplanation as string);

  const contentUrls = extractCloudinaryImages(contents);
  if (contentUrls.length > 0) {
    contentUrls.forEach((url) => mediaUrls.add(url));
  }

  const addedMediaUrls = Array.from(mediaUrls).filter(
    (url) => !previousMediaUrls.has(url),
  );

  const removedMediaUrls = Array.from(previousMediaUrls).filter(
    (url) => !mediaUrls.has(url),
  );

  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    question.difficulty = newDifficulty;
    if (passageId !== undefined) {
      question.passageId = existingPassage
        ? (existingPassage._id as mongoose.Types.ObjectId)
        : null;
    }
    question.slug = newSlug;
    await question.save({ session: mongoSession });

    if (question.status === QUESTION_STATUS.PUBLISHED) {
      if (isVersionChanged) {
        currentVersion.isCurrent = false;
        await currentVersion.save({ session: mongoSession });

        const newVersionNumber = currentVersion.versionNumber + 1;
        const newVersionPayload = {
          type: QUESTION_TYPE.FILL_BLANK,
          question: question._id,
          versionNumber: newVersionNumber,
          isCurrent: true,
          stem: newStem,
          planStem: planHtml,
          acceptedAnswers: newAcceptedAnswers,
          isCaseSensitive: newIsCaseSensitive,
          contentHash: hashedContent,
          language,
          explanation: newExplanation || null,
          changeLog: changeLog || `Updated to version ${newVersionNumber}`,
          mediaUrl: newMediaUrl || null,
          author: user._id,
        };

        const newVersion = await FillBlankQuestionVersion.create(
          [newVersionPayload],
          { session: mongoSession },
        );

        if (!newVersion?.[0]) {
          throw new ConflictError("Failed to create question version");
        }
      }
    } else {
      if (isVersionChanged) {
        currentVersion.stem = newStem;
        currentVersion.plainStem = planHtml;
        currentVersion.acceptedAnswers = newAcceptedAnswers;
        currentVersion.isCaseSensitive = newIsCaseSensitive;
        currentVersion.contentHash = hashedContent;
        currentVersion.language = language;
        currentVersion.explanation = newExplanation || null;
        currentVersion.mediaUrl = newMediaUrl || null;
        if (changeLog) {
          currentVersion.changeLog = changeLog;
        }
        currentVersion.author = user._id;
        await currentVersion.save({ session: mongoSession });
      }
    }

    if (addedMediaUrls.length > 0) {
      await attachCloudinaryMedia(addedMediaUrls, {
        entityType: "Question",
        entityId: question._id,
      });
    }

    if (
      question.status !== QUESTION_STATUS.PUBLISHED &&
      removedMediaUrls.length > 0
    ) {
      await unattachCloudinaryMedia(removedMediaUrls, {
        entityType: "Question",
        entityId: question._id,
      });
    }

    await mongoSession.commitTransaction();

    return question;
  } catch (error) {
    if (mongoSession.inTransaction()) {
      await mongoSession.abortTransaction();
    }
    throw error;
  } finally {
    await mongoSession.endSession();
  }
};

// 11. UPDATE MATCHING QUESTIONS
const updateMatchingQuestion = async (
  id: string,
  user: IUserDoc,
  payload: TUpdateMatchingQuestionPayloadType,
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

  const question = await Question.findById(id);
  if (!question) {
    throw new NotFoundError("Question not found.");
  }

  if (question.type !== QUESTION_TYPE.MATCHING) {
    throw new BadRequest(
      `Question type mismatch. Expected ${QUESTION_TYPE.MATCHING}, got ${question.type}.`,
    );
  }

  if (question.status === QUESTION_STATUS.ARCHIVED) {
    throw new BadRequest("Cannot update an archived question.");
  }

  let existingPassage = null;
  if (passageId !== undefined) {
    if (passageId) {
      existingPassage = await Passage.findById(passageId);
      if (!existingPassage) {
        throw new NotFoundError("Passage not found.");
      }
      if (existingPassage.status !== PASSAGE_STATUS.PUBLISHED) {
        throw new BadRequest(
          `Cannot attach question to a ${existingPassage.status} passage. The passage must be published first.`,
        );
      }
    }
  }

  const currentVersion = await MatchingPairQuestionVersion.findOne({
    question: question._id,
    isCurrent: true,
  });

  if (!currentVersion) {
    throw new NotFoundError("Active question version not found.");
  }

  const newStem = stem ?? currentVersion.stem;
  const newPairs = (pairs as IMatchingPair[]) ?? currentVersion.pairs;
  const newExplanation =
    explanation !== undefined ? explanation : currentVersion.explanation;
  const newMediaUrl =
    mediaUrl !== undefined ? mediaUrl : currentVersion.mediaUrl;
  const newDifficulty = difficulty ?? question.difficulty;

  // Check if version content changed:
  const isVersionChanged = questionUtils.hasVersionContentChanged({
    type: QUESTION_TYPE.MATCHING,
    currentVersion,
    newStem,
    newPairs,
    newExplanation,
    newMediaUrl,
  });

  // Check if question metadata changed:
  const isQuestionChanged = questionUtils.hasQuestionMetadataChanged({
    currentDifficulty: question.difficulty,
    newDifficulty: difficulty,
    currentPassageId: question.passageId,
    targetPassageId: existingPassage?._id,
    isPassageProvided: passageId !== undefined,
  });

  if (!isVersionChanged && !isQuestionChanged) {
    throw new BadRequest("No changes detected in question or version content.");
  }

  // Validate matching pairs
  questionUtils.validateMatchingPairs(newPairs);

  const hashedContent = questionUtils.generateContentHash({
    type: QUESTION_TYPE.MATCHING,
    stem: newStem,
    pairs: newPairs,
  });

  const duplicateContent =
    await questionVersionServices.checkDuplicateByHash(hashedContent);

  if (
    duplicateContent &&
    duplicateContent.question?._id?.toString() !== question._id.toString()
  ) {
    throw new ConflictError("The question with same pairs already exists.");
  }

  const language = questionUtils.detectLanguage(newStem);
  const planHtml = questionUtils.stripHtml(newStem);

  let newSlug = question.slug;
  if (stem && stem !== currentVersion.stem) {
    newSlug = questionUtils.generateSafeQuestionSlug(newStem, question.code);
    const duplicateSlug = await Question.exists({
      slug: newSlug,
      _id: { $ne: question._id },
    });
    if (duplicateSlug) {
      throw new ConflictError(
        "Slug collision occurred for this question stem.",
      );
    }
  }

  const previousMediaUrls =
    questionUtils.extractMediaUrlsFromVersion(currentVersion);

  const mediaUrls = new Set<string>();
  if (newMediaUrl) mediaUrls.add(newMediaUrl);

  const contents: string[] = [newStem];
  if (newExplanation) contents.push(newExplanation as string);
  newPairs.forEach((p) => {
    if (p.left) contents.push(p.left);
    if (p.right) contents.push(p.right);
  });

  const contentUrls = extractCloudinaryImages(contents);
  if (contentUrls.length > 0) {
    contentUrls.forEach((url) => mediaUrls.add(url));
  }

  const addedMediaUrls = Array.from(mediaUrls).filter(
    (url) => !previousMediaUrls.has(url),
  );

  const removedMediaUrls = Array.from(previousMediaUrls).filter(
    (url) => !mediaUrls.has(url),
  );

  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    question.difficulty = newDifficulty;
    if (passageId !== undefined) {
      question.passageId = existingPassage
        ? (existingPassage._id as mongoose.Types.ObjectId)
        : null;
    }
    question.slug = newSlug;
    await question.save({ session: mongoSession });

    if (question.status === QUESTION_STATUS.PUBLISHED) {
      if (isVersionChanged) {
        currentVersion.isCurrent = false;
        await currentVersion.save({ session: mongoSession });

        const newVersionNumber = currentVersion.versionNumber + 1;
        const newVersionPayload = {
          type: QUESTION_TYPE.MATCHING,
          question: question._id,
          versionNumber: newVersionNumber,
          isCurrent: true,
          stem: newStem,
          planStem: planHtml,
          pairs: newPairs,
          contentHash: hashedContent,
          language,
          explanation: newExplanation || null,
          changeLog: changeLog || `Updated to version ${newVersionNumber}`,
          mediaUrl: newMediaUrl || null,
          author: user._id,
        };

        const newVersion = await MatchingPairQuestionVersion.create(
          [newVersionPayload],
          { session: mongoSession },
        );

        if (!newVersion?.[0]) {
          throw new ConflictError("Failed to create question version");
        }
      }
    } else {
      if (isVersionChanged) {
        currentVersion.stem = newStem;
        currentVersion.plainStem = planHtml;
        currentVersion.pairs = newPairs;
        currentVersion.contentHash = hashedContent;
        currentVersion.language = language;
        currentVersion.explanation = newExplanation || null;
        currentVersion.mediaUrl = newMediaUrl || null;
        if (changeLog) {
          currentVersion.changeLog = changeLog;
        }
        currentVersion.author = user._id;
        await currentVersion.save({ session: mongoSession });
      }
    }

    if (addedMediaUrls.length > 0) {
      await attachCloudinaryMedia(addedMediaUrls, {
        entityType: "Question",
        entityId: question._id,
      });
    }

    if (
      question.status !== QUESTION_STATUS.PUBLISHED &&
      removedMediaUrls.length > 0
    ) {
      await unattachCloudinaryMedia(removedMediaUrls, {
        entityType: "Question",
        entityId: question._id,
      });
    }

    await mongoSession.commitTransaction();

    return question;
  } catch (error) {
    if (mongoSession.inTransaction()) {
      await mongoSession.abortTransaction();
    }
    throw error;
  } finally {
    await mongoSession.endSession();
  }
};

// 12. UPDATE ORDERING QUESTIONS
const updateOrderingQuestion = async (
  id: string,
  user: IUserDoc,
  payload: TUpdateOrderingQuestionPayloadType,
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

  const question = await Question.findById(id);
  if (!question) {
    throw new NotFoundError("Question not found.");
  }

  if (question.type !== QUESTION_TYPE.ORDERING) {
    throw new BadRequest(
      `Question type mismatch. Expected ${QUESTION_TYPE.ORDERING}, got ${question.type}.`,
    );
  }

  if (question.status === QUESTION_STATUS.ARCHIVED) {
    throw new BadRequest("Cannot update an archived question.");
  }

  let existingPassage = null;
  if (passageId !== undefined) {
    if (passageId) {
      existingPassage = await Passage.findById(passageId);
      if (!existingPassage) {
        throw new NotFoundError("Passage not found.");
      }

      if (existingPassage.status !== PASSAGE_STATUS.PUBLISHED) {
        throw new BadRequest(
          `Cannot attach question to a ${existingPassage.status} passage. The passage must be published first.`,
        );
      }
    }
  }

  const currentVersion = await OrderingQuestionVersion.findOne({
    question: question._id,
    isCurrent: true,
  });

  if (!currentVersion) {
    throw new NotFoundError("Active question version not found.");
  }

  const newStem = stem ?? currentVersion.stem;
  const newOrderingItems =
    (orderingItems as IOrderingItem[]) ?? currentVersion.orderingItems;
  const newExplanation =
    explanation !== undefined ? explanation : currentVersion.explanation;
  const newMediaUrl =
    mediaUrl !== undefined ? mediaUrl : currentVersion.mediaUrl;
  const newDifficulty = difficulty ?? question.difficulty;

  // Check if version content changed:
  const isVersionChanged = questionUtils.hasVersionContentChanged({
    type: QUESTION_TYPE.ORDERING,
    currentVersion,
    newStem,
    newOrderingItems,
    newExplanation,
    newMediaUrl,
  });

  // Check if question metadata changed:
  const isQuestionChanged = questionUtils.hasQuestionMetadataChanged({
    currentDifficulty: question.difficulty,
    newDifficulty: difficulty,
    currentPassageId: question.passageId,
    targetPassageId: existingPassage?._id,
    isPassageProvided: passageId !== undefined,
  });

  if (!isVersionChanged && !isQuestionChanged) {
    throw new BadRequest("No changes detected in question or version content.");
  }

  // Validate ordering items
  questionUtils.validateOrderingItems(newOrderingItems);

  const hashedContent = questionUtils.generateContentHash({
    type: QUESTION_TYPE.ORDERING,
    stem: newStem,
    orderingItems: newOrderingItems,
  });

  const duplicateContent =
    await questionVersionServices.checkDuplicateByHash(hashedContent);

  if (
    duplicateContent &&
    duplicateContent.question?._id?.toString() !== question._id.toString()
  ) {
    throw new ConflictError("The question with same items already exists.");
  }

  const language = questionUtils.detectLanguage(newStem);
  const planHtml = questionUtils.stripHtml(newStem);

  let newSlug = question.slug;
  if (stem && stem !== currentVersion.stem) {
    newSlug = questionUtils.generateSafeQuestionSlug(newStem, question.code);
    const duplicateSlug = await Question.exists({
      slug: newSlug,
      _id: { $ne: question._id },
    });
    if (duplicateSlug) {
      throw new ConflictError(
        "Slug collision occurred for this question stem.",
      );
    }
  }

  const previousMediaUrls =
    questionUtils.extractMediaUrlsFromVersion(currentVersion);

  const mediaUrls = new Set<string>();
  if (newMediaUrl) mediaUrls.add(newMediaUrl);

  const contents: string[] = [newStem];
  if (newExplanation) contents.push(newExplanation as string);
  newOrderingItems.forEach((item) => {
    if (item.text) contents.push(item.text);
  });

  const contentUrls = extractCloudinaryImages(contents);
  if (contentUrls.length > 0) {
    contentUrls.forEach((url) => mediaUrls.add(url));
  }

  const addedMediaUrls = Array.from(mediaUrls).filter(
    (url) => !previousMediaUrls.has(url),
  );

  const removedMediaUrls = Array.from(previousMediaUrls).filter(
    (url) => !mediaUrls.has(url),
  );

  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    question.difficulty = newDifficulty;
    if (passageId !== undefined) {
      question.passageId = existingPassage
        ? (existingPassage._id as mongoose.Types.ObjectId)
        : null;
    }
    question.slug = newSlug;
    await question.save({ session: mongoSession });

    if (question.status === QUESTION_STATUS.PUBLISHED) {
      if (isVersionChanged) {
        currentVersion.isCurrent = false;
        await currentVersion.save({ session: mongoSession });

        const newVersionNumber = currentVersion.versionNumber + 1;
        const newVersionPayload = {
          type: QUESTION_TYPE.ORDERING,
          question: question._id,
          versionNumber: newVersionNumber,
          isCurrent: true,
          stem: newStem,
          planStem: planHtml,
          orderingItems: newOrderingItems,
          contentHash: hashedContent,
          language,
          explanation: newExplanation || null,
          changeLog: changeLog || `Updated to version ${newVersionNumber}`,
          mediaUrl: newMediaUrl || null,
          author: user._id,
        };

        const newVersion = await OrderingQuestionVersion.create(
          [newVersionPayload],
          { session: mongoSession },
        );

        if (!newVersion?.[0]) {
          throw new ConflictError("Failed to create question version");
        }
      }
    } else {
      if (isVersionChanged) {
        currentVersion.stem = newStem;
        currentVersion.plainStem = planHtml;
        currentVersion.orderingItems = newOrderingItems;
        currentVersion.contentHash = hashedContent;
        currentVersion.language = language;
        currentVersion.explanation = newExplanation || null;
        currentVersion.mediaUrl = newMediaUrl || null;
        if (changeLog) {
          currentVersion.changeLog = changeLog;
        }
        currentVersion.author = user._id;
        await currentVersion.save({ session: mongoSession });
      }
    }

    if (addedMediaUrls.length > 0) {
      await attachCloudinaryMedia(addedMediaUrls, {
        entityType: "Question",
        entityId: question._id,
      });
    }

    if (
      question.status !== QUESTION_STATUS.PUBLISHED &&
      removedMediaUrls.length > 0
    ) {
      await unattachCloudinaryMedia(removedMediaUrls, {
        entityType: "Question",
        entityId: question._id,
      });
    }

    await mongoSession.commitTransaction();

    return question;
  } catch (error) {
    if (mongoSession.inTransaction()) {
      await mongoSession.abortTransaction();
    }
    throw error;
  } finally {
    await mongoSession.endSession();
  }
};

// 12. GET QUESTION BY ID:
const getQuestionByID = async (
  id: string,
  query: TGetQuestionByIDQueryType,
) => {
  const { includeAllVersion } = query;

  console.log(includeAllVersion);
  const question = await Question.findById(id);
  if (!question) {
    throw new NotFoundError("Question not found.");
  }

  const formattedResponse: Record<string, unknown> = {
    question,
  };

  if (includeAllVersion) {
    const versions = await QuestionVersion.find({
      question: question?._id,
    });

    formattedResponse["versions"] = versions || [];
  }

  // find the latest version
  const currentVersion = await QuestionVersion.findOne({
    isCurrent: true,
    question: question?._id,
  });

  formattedResponse["currentVersion"] = currentVersion ?? null;

  return formattedResponse;
};

// 13. GET ALL QUESTIONS:
const getAllQuestionsFromDB = async (query: TGetAllQuestionQueryType) => {
  const {
    code,
    difficulty,
    slug,
    authors,
    passageIds,
    status,
    isFlagged,
    type,
    projection,
  } = query;
  const { page, limit, skip, searchTerm, fromDate, toDate, sortBy, sortOrder } =
    formatQuery(query, questionsSortableFields);

  const pipeline: PipelineStage[] = [];
  const matchingStage: PipelineStage.Match = { $match: {} };

  // Filter by code:
  if (code) {
    matchingStage.$match["code"] = code;
  }

  // Filter by difficulty:
  if (difficulty) {
    matchingStage.$match["difficulty"] = difficulty;
  }

  // Filter by difficulty:
  if (slug) {
    matchingStage.$match["slug"] = slug;
  }

  // Filter by difficulty:
  if (authors !== undefined && Array.isArray(authors) && authors?.length > 0) {
    matchingStage.$match["author"] = {
      $in: authors,
    };
  }

  // Filter by difficulty:
  if (passageIds) {
    matchingStage.$match["passageId"] = {
      $in: passageIds,
    };
  }

  // Filter by status
  if (status) {
    matchingStage.$match["status"] = status;
  }

  // Filter by status
  if (type) {
    matchingStage.$match["type"] = type;
  }

  // Filter by flagged:
  if (isFlagged) {
    matchingStage.$match["isFlagged"] = isFlagged;
  }

  // Do date filtering:
  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {};

    if (fromDate)
      dateFilter["$gte"] = moment(fromDate, "YYYY-MM-DD")
        .startOf("day")
        ?.toDate();

    if (toDate)
      dateFilter["$lte"] = moment(toDate, "YYYY-MM-DD").endOf("day")?.toDate();

    if (Object.keys(dateFilter)?.length > 1)
      matchingStage.$match["createdAt"] = dateFilter;
  }

  pipeline.push(matchingStage);

  // Lookup passage:
  pipeline.push(
    {
      $lookup: {
        from: "passages",
        localField: "passageId",
        foreignField: "_id",
        as: "passageDetails",
      },
    },
    {
      $unwind: {
        path: "$passageDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
  );

  // Search Now:
  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: [
          ...questionsSearchableFields,
          "passageDetails.titleEn",
          "passageDetails.titleBn",
        ].map((field) => {
          return {
            [field]: {
              $regex: searchTerm,
              $options: "i",
            },
          };
        }),
      },
    });
  }

  // Lookup passage:
  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "authorDetails",
      },
    },
    {
      $unwind: {
        path: "$authorDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
  );

  // Lookup Question Version:
  pipeline.push(
    {
      $lookup: {
        from: "questionversions",
        as: "currentVersion",
        let: { questionId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$$questionId", "$question"],
              },
              isCurrent: true,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$currentVersion",
        preserveNullAndEmptyArrays: true,
      },
    },
  );

  const projectedFields =
    questionProjections[
      (projection as "list" | "options" | "details") || "list"
    ];

  pipeline.push({ $project: projectedFields });

  // Sorting:
  pipeline.push({
    $sort: {
      [sortBy]: sortOrder,
    },
  });

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: "total" }],
    },
  });

  const aggregated = await Question.aggregate(pipeline);

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

// 14. Get all  published questions:
const getAllPublishedQuestionsFromDB = async (
  query: TGetAllQuestionQueryType,
) => {
  return await getAllQuestionsFromDB({
    ...query,
    status: QUESTION_STATUS.PUBLISHED,
    isFlagged: true,
  });
};

// 15. Publish a question:
const publishQuestionByID = async (id: string) => {
  // 1. Get question:
  const question = await Question.findById(id);

  if (!question) {
    throw new NotFoundError("Question not found.");
  }

  // 2. Check question status:
  if (question.status === QUESTION_STATUS.PUBLISHED) {
    throw new BadRequest("This question has already been published.");
  }

  // 3. Check Is question is archived?:
  if (question.status === QUESTION_STATUS.ARCHIVED) {
    throw new BadRequest("You can not publish an archived question.");
  }

  // Retrieved the passage:
  if (question.passageId) {
    //  retrieved the passage:
    const passage = await Passage.findById(question.passageId);

    if (!passage) {
      throw new NotFoundError("Passage not found.");
    }

    if (passage.status !== PASSAGE_STATUS.PUBLISHED) {
      throw new BadRequest(
        `You cannot publish this question because the passage is currently ${passage.status}.`,
      );
    }
  }

  question.status = QUESTION_STATUS.PUBLISHED;
  question.publishedAt = new Date();

  await question.save();

  return question;
};

// 16. Archived a question:
const archivedQuestionByID = async (id: string) => {
  // 1. Get question:
  const question = await Question.findById(id);

  if (!question) {
    throw new NotFoundError("Question not found.");
  }

  // 2. Check question status:
  if (question.status === QUESTION_STATUS.ARCHIVED) {
    throw new BadRequest("This question has already been archived.");
  }

  // 3. Check Is question is archived?:
  if (question.status === QUESTION_STATUS.DRAFT) {
    throw new BadRequest("You can not archive a drafted question.");
  }

  question.status = QUESTION_STATUS.ARCHIVED;
  question.archivedAt = new Date();

  await question.save();

  return question;
};

export const questionsServices = {
  createSingleMcqQuestion,
  createMultiMcqQuestion,
  createTrueFalseQuestion,
  createFillBlankQuestion,
  createMatchingQuestion,
  createOrderingQuestion,
  updateSingleMcqQuestion,
  updateMultiMcqQuestion,
  updateTrueFalseQuestion,
  updateFillBlankQuestion,
  updateMatchingQuestion,
  updateOrderingQuestion,

  getQuestionByID,
  getAllQuestionsFromDB,
  getAllPublishedQuestionsFromDB,

  // Status :
  publishQuestionByID,
  archivedQuestionByID,
};

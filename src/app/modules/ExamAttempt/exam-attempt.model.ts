import { Schema, model } from "mongoose";
import type {
  IExamAttemptDoc,
  IBaseAttemptItem,
  ISelfPracticeConfig,
} from "./exam-attempt.interfaces";
import {
  ExamAttemptStatus,
  examAttemptStatusValues,
} from "./exam-attempt.constants";

// 1. Base Attempt Question Schema
const baseAttemptItemSchema = new Schema<IBaseAttemptItem>(
  {
    mappingId: {
      type: Schema.Types.ObjectId,
      ref: "QuestionMapping",
      required: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    versionId: {
      type: Schema.Types.ObjectId,
      ref: "QuestionVersion",
      default: null,
    },
    isAnswered: {
      type: Boolean,
      default: false,
    },
    isMarkedForReview: {
      type: Boolean,
      default: false,
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    discriminatorKey: "questionType",
    _id: false,
  },
);

// 2. Self Practice Config Schema
const selfPracticeConfigSchema = new Schema<ISelfPracticeConfig>(
  {
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      default: null,
    },
    topics: [
      {
        type: Schema.Types.ObjectId,
        ref: "Topic",
      },
    ],
    totalQuestions: {
      type: Number,
      default: 0,
    },
    durationMins: {
      type: Number,
      default: 0,
    },
  },
  { _id: false },
);

// 3. Main ExamAttempt Schema
const examAttemptSchema = new Schema<IExamAttemptDoc>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isSelfPractice: {
      type: Boolean,
      default: false,
      index: true,
    },
    examId: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      default: null,
      index: true,
    },
    attemptNumber: {
      type: Number,
      default: 1,
      min: 1,
    },

    selfPracticeConfig: {
      type: selfPracticeConfigSchema,
      default: null,
    },

    status: {
      type: String,
      enum: examAttemptStatusValues,
      default: ExamAttemptStatus.IN_PROGRESS,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    totalTimeTakenSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    questions: [baseAttemptItemSchema],

    tabSwitchedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// 4. Attach Discriminators to `questions` subdocument array
const questionsArray = examAttemptSchema.path(
  "questions",
) as Schema.Types.DocumentArray;

// (a) Single MCQ
questionsArray.discriminator(
  "single_mcq",
  new Schema(
    {
      userAnswer: {
        type: Schema.Types.ObjectId,
        default: null,
      },
    },
    { _id: false },
  ),
);

// (b) True / False
questionsArray.discriminator(
  "true_false",
  new Schema(
    {
      userAnswer: {
        type: Schema.Types.ObjectId,
        default: null,
      },
    },
    { _id: false },
  ),
);

// (c) Multiple MCQ
questionsArray.discriminator(
  "multi_mcq",
  new Schema(
    {
      userAnswer: [
        {
          type: Schema.Types.ObjectId,
        },
      ],
    },
    { _id: false },
  ),
);

questionsArray.discriminator(
  "multiple_mcq",
  new Schema(
    {
      userAnswer: [
        {
          type: Schema.Types.ObjectId,
        },
      ],
    },
    { _id: false },
  ),
);

// (d) Fill in the Blank
questionsArray.discriminator(
  "fill_blank",
  new Schema(
    {
      userAnswer: {
        type: String,
        trim: true,
        default: null,
      },
    },
    { _id: false },
  ),
);

// (e) Matching
questionsArray.discriminator(
  "matching",
  new Schema(
    {
      userAnswer: [
        {
          left: { type: String, required: true },
          right: { type: String, required: true },
          _id: false,
        },
      ],
    },
    { _id: false },
  ),
);

// (f) Ordering
questionsArray.discriminator(
  "ordering",
  new Schema(
    {
      userAnswer: [
        {
          type: String,
        },
      ],
    },
    { _id: false },
  ),
);

// 5. Compound Indexes
// User's active attempts for an exam
examAttemptSchema.index({ user: 1, examId: 1, status: 1 });

// Query for expired attempts by background scheduler
examAttemptSchema.index({ status: 1, expiresAt: 1 });

export const ExamAttempt = model<IExamAttemptDoc>("ExamAttempt", examAttemptSchema);

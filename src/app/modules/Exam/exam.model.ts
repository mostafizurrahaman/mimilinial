import { Schema, model } from "mongoose";
import type {
  IExamDoc,
  ICategoryExamDoc,
  ITrackExamDoc,
  ISubjectExamDoc,
  ITopicExamDoc,
} from "./exam.interfaces";
import {
  examTypeValues,
  examStatusValues,
  generationModeValues,
  EXAM_STATUS,
  EXAM_TYPE,
  GENERATION_MODE,
} from "./exam.constants";

// 1. Base Schema (Shared Fields Across All Exam Types)
const examBaseSchema = new Schema<IExamDoc>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },

    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    generationMode: {
      type: String,
      enum: generationModeValues,
      default: GENERATION_MODE.MANUAL,
      required: true,
    },

    durationMins: {
      type: Number,
      required: true,
      min: [1, "Duration must be at least 1 minute"],
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: [1, "Total questions must be at least 1"],
    },
    marksPerQuestion: {
      type: Number,
      required: true,
      min: [0.1, "Marks per question must be at least 0.1"],
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: [0, "Negative marks cannot be less than 0"],
    },
    totalMarks: {
      type: Number,
      required: true,
    },
    passMarks: {
      type: Number,
      required: true,
    },

    questionMappings: [
      {
        type: Schema.Types.ObjectId,
        ref: "QuestionMapping",
      },
    ],

    isRandomized: {
      type: Boolean,
      default: true,
    },
    isOptionShuffled: {
      type: Boolean,
      default: true,
    },
    isSpeedTest: {
      type: Boolean,
      default: false,
    },

    examType: {
      type: String,
      enum: examTypeValues,
      default: EXAM_TYPE.MODEL_TEST,
      index: true,
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: examStatusValues,
      default: EXAM_STATUS.DRAFT,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    editor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    discriminatorKey: "examLevel",
  },
);

export const Exam = model<IExamDoc>("Exam", examBaseSchema);

// 2. Category Exam Discriminator
export const CategoryExam = Exam.discriminator<ICategoryExamDoc>(
  "category",
  new Schema({}),
);

// 3. Track Exam Discriminator
export const TrackExam = Exam.discriminator<ITrackExamDoc>(
  "track",
  new Schema({
    track: {
      type: Schema.Types.ObjectId,
      ref: "Track",
      required: true,
      index: true,
    },
  }),
);

// 4. Subject Exam Discriminator (Single Subject)
export const SubjectExam = Exam.discriminator<ISubjectExamDoc>(
  "subject",
  new Schema({
    subject: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },
  }),
);

// 5. Topic Exam Discriminator (Single Subject + Multiple Topics)
export const TopicExam = Exam.discriminator<ITopicExamDoc>(
  "topic",
  new Schema({
    subject: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },
    topics: [
      {
        type: Schema.Types.ObjectId,
        ref: "Topic",
        required: true,
      },
    ],
  }),
);

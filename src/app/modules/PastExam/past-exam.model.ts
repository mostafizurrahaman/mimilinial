import { Schema, model } from "mongoose";
import type { IPastExamDoc } from "./past-exam.interfaces";
import { EXAM_STATUS, EXAM_STATUS_VALUES } from "./past-exam.constants";

const pastExamSchema = new Schema<IPastExamDoc>(
  {
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    track: {
      type: Schema.Types.ObjectId,
      ref: "Track",
      default: null,
      index: true,
    },
    nameBn: {
      type: String,
      required: true,
      trim: true,
    },
    nameEn: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      index: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    year: {
      type: String,
      required: true,
      minlength: 4,
      maxLength: 4,
      index: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
    },
    totalQuestions: {
      type: Number,
      required: true,
      default: 0,
    },
    mappedQuestions: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: EXAM_STATUS_VALUES,
      default: EXAM_STATUS.DRAFT,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

pastExamSchema.index(
  {
    category: 1,
    track: 1,
    year: 1,
  },
  {
    name: "past_exam_category_track_year_index",
  },
);

pastExamSchema.index({ status: 1 });

export const PastExam = model<IPastExamDoc>("PastExam", pastExamSchema);

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
      allowNull: true,
      default: true,
      index: true,
    },
    nameBn: {
      type: String,
      required: true,
    },
    nameEn: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      slug: true,
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
    },
    description: {
      type: String,
      allowNull: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: EXAM_STATUS_VALUES,
      default: EXAM_STATUS.DRAFT,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
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
    slug: 1,
  },
  {
    unique: true,
    name: "unique_past_exam_per_year",
  },
);
export const PastExam = model<IPastExamDoc>("PastExam", pastExamSchema);

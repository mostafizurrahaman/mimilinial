import { Schema, model } from "mongoose";
import { maxLength, uppercase } from "zod";
import {
  QUESTION_DIFFICULTY,
  QUESTION_DIFFICULTY_VALUES,
  QUESTION_STATUS,
  QUESTION_STATUS_VALUES,
  QUESTION_TYPE_VALUES,
} from "./questions.constants";
import type { IQuestionDoc } from "./questions.interfaces";

const questionsSchema = new Schema<IQuestionDoc>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxLength: [50, "Question code cannot exceed 50 characters."],
      index: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      index: true,
      lowercase: true,
    },
    type: {
      type: String,
      enum: QUESTION_TYPE_VALUES,
      required: true,
      index: true,
    },
    difficulty: {
      type: String,
      required: true,
      enum: QUESTION_DIFFICULTY_VALUES,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: QUESTION_STATUS_VALUES,
      index: true,
      default: QUESTION_STATUS.DRAFT,
    },
    passageId: {
      type: Schema.Types.ObjectId,
      ref: "Passage",
      index: true,
      allowNull: true,
      default: null,
    },
    isFlagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

/**
 * ----------------------------
 *    Question Model Index
 * ----------------------------
 */

// To filter exam paper or practice session questions:
questionsSchema.index({
  type: 1,
  difficulty: 1,
  status: 1,
});

// 2. Status and flag handle:
questionsSchema.index({ status: 1, isFlagged: 1 });

export const Question = model<IQuestionDoc>("Question", questionsSchema);

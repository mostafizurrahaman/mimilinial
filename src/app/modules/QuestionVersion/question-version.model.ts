import { Schema, model } from "mongoose";
import type {
  IFillBlankVersion,
  IMatchingPair,
  IMatchingVersion,
  IMultiMcqVersion,
  IOrderingItem,
  IOrderingVersion,
  IQuestionOption,
  IQuestionVersionDoc,
  ISingleMcqVersion,
  ITrueFalseVersion,
} from "./question-version.interfaces";
import { QUESTION_TYPE, QUESTION_TYPE_VALUES } from "../Questions";
import {
  QUESTION_VERSION_LANGUAGE,
  QuestionVersionLanguageValues,
} from "./question-version.constants";


/**
 * -------------------------
 *    Question Option Schema (MCQ (single/multi), True/False)
 * -------------------------
 */
const questionOptionSchema = new Schema<IQuestionOption>(
  {
    sortOrder: {
      type: Number,
      required: true,
      default: 1,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    mediaUrl: {
      type: String,
      allowNull: true,
      default: null,
    },
    isCorrect: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    _id: true,
    versionKey: false,
  },
);

/**
 * -------------------------
 *    Matching pair Schema
 * -------------------------
 */

const matchingPairSchema = new Schema<IMatchingPair>(
  {
    left: {
      type: String,
      required: true,
    },
    right: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);

/**
 * -------------------------
 *    Order Item Schema
 * -------------------------
 */

const orderingItemSchema = new Schema<IOrderingItem>(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    correctOrder: {
      type: Number,
      required: true,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);




const questionVersionSchema = new Schema<IQuestionVersionDoc>(
  {
    type: {
      type: String,
      required: true,
      enum: QUESTION_TYPE_VALUES,
    },
    question: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    isCurrent: {
      type: Boolean,
      required: true,
      default: false,
    },
    stem: {
      type: String,
      required: true,
      trim: true,
    },
    language: {
      type: String,
      required: true,
      enum: QuestionVersionLanguageValues,
      default: QUESTION_VERSION_LANGUAGE.BANGLA,
    },
    mediaUrl: {
      type: String,
      default: null,
      allowNull: true,
    },
    changeLog: {
      type: String,
      default: null,
      allowNull: true,
      trim: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    discriminatorKey: "type",
    timestamps: true,
    versionKey: false,
  },
);

/**
 *  DISCRIMINATOR Schemas
 */

// 1. SINGLE MCQ Version Schema
const singleMcqVersionSchema = new Schema<ISingleMcqVersion>({
  options: {
    type: [questionOptionSchema],
    required: true,
    min: 2,
  },
});

// 2. Multiple Choice Question version:
const multipleChoiceVersionSchema = new Schema<IMultiMcqVersion>({
  options: {
    type: [questionOptionSchema],
    required: true,
    min: 2,
  },
});

// 3. True / False
const trueFalseVersionSchema = new Schema<ITrueFalseVersion>({
  options: {
    type: [questionOptionSchema],
    required: true,
    min: 2,
    max: 2,
  },
});

// 4. Matching Pair:
const matchingPairVersionSchema = new Schema<IMatchingVersion>({
  pairs: {
    type: [matchingPairSchema],
    required: true,
    min: 2,
  },
});

// 5. Fill Blank
const fillBlankVersionSchema = new Schema<IFillBlankVersion>({
   acceptedAnswers:  {
      type: [String], 
      required: true, 
      trim: true,
      min:  1      
   }, 
   isCaseSensitive: { 
      type: Boolean, 
      required: true,
      default: false
   }
})

// 6. Order Item: 
const OrderingItemVersionSchema = new Schema<IOrderingVersion>({
   orderingItems: { 
    type: [orderingItemSchema], 
    requried: true, 
    min: 2, 
   }
})





/**
 * INDEXING
 */

// Duplicate version index with uniqueness:
questionOptionSchema.index(
  {
    question: 1,
    version: 1,
  },
  {
    unique: true,
    name: "uniqueQuestionVersion",
  },
);

// Ensure one question will have one current version only:
questionOptionSchema.index(
  {
    question: 1,
  },
  {
    unique: true,
    partialFilterExpression: { isCurrent: true },
  },
);

// Main model
export const QuestionVersion = model<IQuestionVersionDoc>(
  "QuestionVersion",
  questionVersionSchema,
);

// Single Question Discriminator  Model:
export const SingleMcqVersion = QuestionVersion.discriminator<ISingleMcqVersion>(
  QUESTION_TYPE.SINGLE_MCQ,
  singleMcqVersionSchema,
);

// Multiple Choice Question Discriminator  Model:
export const MultipleChoiceMcqVersion = QuestionVersion.discriminator<IMultiMcqVersion>(
  QUESTION_TYPE.SINGLE_MCQ,
  multipleChoiceVersionSchema,
);

// True / False Question Version Model:
export const TrueFalseMcqVersion = QuestionVersion.discriminator<ITrueFalseVersion>(
  QUESTION_TYPE.TRUE_FALSE,
  trueFalseVersionSchema,
);

// Matching Pair Question Version Model: 
export const MatchingPairQuestionVersion  =  QuestionVersion.discriminator<IMatchingVersion>(QUESTION_TYPE.MATCHING, matchingPairVersionSchema) 

// Fill in the blank: 
export const FillBlankQuestionVersion =  QuestionVersion.discriminator<IFillBlankVersion>(QUESTION_TYPE.FILL_BLANK, fillBlankVersionSchema)

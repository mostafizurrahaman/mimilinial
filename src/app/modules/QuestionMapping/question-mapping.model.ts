import { Schema, model } from "mongoose";
import type { IQuestionMappingDoc } from "./question-mapping.interfaces";

const questionMappingSchema = new Schema<IQuestionMappingDoc>(
  {
    question: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
      index: true,
    },
    coll: {
      type: Schema.Types.ObjectId,
      ref: "Collection",
      required: true,
      index: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    track: {
      type: Schema.Types.ObjectId,
      ref: "Track",
      index: true,
      allowNull: true,
      default: null,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      index: true,
      required: true,
    },
    topic: {
      type: Schema.Types.ObjectId,
      ref: "Topic",
      index: true,
      required: true,
    },
    pastExam: {
      type: Schema.Types.ObjectId,
      ref: "PastExam",
      index: true,
      allowNull: true,
      default: null,
    },
    year: {
      type: String,
      index: true,
      allowNull: true,
      default: null,
    },
    marks: {
      type: Number,
      required: true,
      default: 1,
      min: [0.25, "Marks must be at least 0.25"],
    },
    sortOrder: {
      type: Number,
      default: 0,
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

questionMappingSchema.index({
  question: 1,
  coll: 1,
  category: 1,
  track: 1,
  subject: 1,
  topic: 1,
  pastExam: 1,
});

export const QuestionMapping = model<IQuestionMappingDoc>(
  "QuestionMapping",
  questionMappingSchema,
);

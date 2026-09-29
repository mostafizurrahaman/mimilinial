import { Schema, model } from "mongoose";
import type { IQuestionVersionDoc } from "./question-version.interfaces";

const questionVersionSchema = new Schema<IQuestionVersionDoc>(
   {
      name: { type: String },
   },
   {
      timestamps: true,
      versionKey: false,
   },
);

export const QuestionVersion = model<IQuestionVersionDoc>(
   "QuestionVersion",
   questionVersionSchema,
);

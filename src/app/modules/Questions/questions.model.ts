import { Schema, model } from "mongoose";
import type { IQuestionsDoc } from "./questions.interfaces";

const questionsSchema = new Schema<IQuestionsDoc>(
   {
      name: { type: String },
   },
   {
      timestamps: true,
      versionKey: false,
   },
);

export const Questions = model<IQuestionsDoc>("Questions", questionsSchema);

import { Schema, model } from "mongoose";
import type { IQuestionMappingDoc } from "./question-mapping.interfaces";

const questionMappingSchema = new Schema<IQuestionMappingDoc>(
   {
      name: { type: String },
   },
   {
      timestamps: true,
      versionKey: false,
   },
);

export const QuestionMapping = model<IQuestionMappingDoc>("QuestionMapping", questionMappingSchema);

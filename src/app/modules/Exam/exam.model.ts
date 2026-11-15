import { Schema, model } from "mongoose";
import type { IExamDoc } from "./exam.interfaces";

const examSchema = new Schema<IExamDoc>(
   {
      name: { type: String },
   },
   {
      timestamps: true,
      versionKey: false,
   },
);

export const Exam = model<IExamDoc>("Exam", examSchema);

import { Schema, model } from "mongoose";
import type { ISubjectDoc } from "./subject.interfaces";

const subjectSchema = new Schema<ISubjectDoc>(
   {
      name: { type: String },
   },
   {
      timestamps: true,
      versionKey: false,
   },
);

export const Subject = model<ISubjectDoc>("Subject", subjectSchema);

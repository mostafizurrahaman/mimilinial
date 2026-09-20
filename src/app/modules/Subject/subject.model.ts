import { Schema, model } from "mongoose";
import type { ISubjectDoc } from "./subject.interfaces";

const subjectSchema = new Schema<ISubjectDoc>(
   {
      name_bn: { type: String, required: true },
      name_en: {
         type: String,
         required: true,
      },
      slug: {
         type: String,
         required: true,
         index: true,
         unique: true,
      },
      code: {
         type: String,
         required: true,
      },
      description: {
         type: String,
      },
      colorCode: {
         type: String,
         required: true,
      },
      icon: {
         type: String,
         allowNull: null,
      },
      sortOrder: {
         type: Number,
         required: true,
         min: 1,
      },
      isFeatured: {
         type: Boolean,
         required: true,
         default: true,
      },
      metaTitle: {
         type: String,
         allowNull: null,
      },
      metaDescription: {
         type: String,
         allowNull: null,
         default: null,
      },
   },
   {
      timestamps: true,
      versionKey: false,
   },
);

export const Subject = model<ISubjectDoc>("Subject", subjectSchema);

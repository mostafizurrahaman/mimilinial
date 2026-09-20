import { Schema, model } from "mongoose";
import type { ISubjectDoc } from "./subject.interfaces";

const subjectSchema = new Schema<ISubjectDoc>(
  {
    name_bn: {
      type: String,
      required: true,
    },
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
      unique: true,
      required: true,
    },
    description: {
      type: String,
      allowNull: true,
      default: null,
    },
    colorCode: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      allowNull: true,
      default: null,
    },
    sortOrder: {
      type: Number,
      required: true,
      min: 1,
    },
    isFeatured: {
      type: Boolean,
      required: true,
      default: false,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    metaTitle: {
      type: String,
      allowNull: true,
      maxLength: 60,
    },
    metaDescription: {
      type: String,
      allowNull: true,
      maxLength: 160,
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

export const Subject = model<ISubjectDoc>("Subject", subjectSchema);

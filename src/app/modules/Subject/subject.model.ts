import { Schema, model } from "mongoose";
import type { ISubjectDoc } from "./subject.interfaces";
import { SUBJECT_STATUS, SUBJECT_STATUS_VALUES } from "./subject.constants";

const subjectSchema = new Schema<ISubjectDoc>(
  {
    nameBn: {
      type: String,
      required: true,
    },
    nameEn: {
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
    ogImage: {
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
    status: {
      type: String,
      enum: SUBJECT_STATUS_VALUES,
      default: SUBJECT_STATUS.DRAFT,
    },
    publishedAt: {
      type: Date,
      allowNull: true,
      default: null,
    },
    archivedAt: {
      type: Date,
      allowNull: true,
      default: null,
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

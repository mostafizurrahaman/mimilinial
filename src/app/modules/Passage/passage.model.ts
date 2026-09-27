import { Schema, model } from "mongoose";
import type { IPassageDoc } from "./passage.interfaces";
import { PASSAGE_STATUS, PASSAGE_STATUS_VALUES } from "./passage.constants";

const passageSchema = new Schema<IPassageDoc>(
  {
    titleEn: {
      type: String,
      required: true,
    },
    titleBn: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    bodyBn: {
      type: String,
      required: true,
    },
    bodyEn: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: PASSAGE_STATUS_VALUES,
      default: PASSAGE_STATUS.DRAFT,
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    metaTitle: {
      type: String,
      allowNull: true,
      default: null,
    },
    metaDescription: {
      type: String,
      allowNull: true,
      default: null,
    },
    ogImage: {
      type: String,
      allowNull: true,
      default: null,
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

export const Passage = model<IPassageDoc>("Passage", passageSchema);

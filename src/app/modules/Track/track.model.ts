import { Schema, model } from "mongoose";
import type { ITrackDoc } from "./track.interfaces";
import { trackStatus, trackStatusValues } from "./track.constants";

const trackSchema = new Schema<ITrackDoc>(
  {
    category: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Category",
    },
    nameBn: {
      type: String,
      required: true,
      trim: true,
    },
    nameEn: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
    },
    description: {
      type: String,
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
    status: {
      type: String,
      enum: trackStatusValues,
      default: trackStatus.DRAFT,
    },
    author: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Author",
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
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

trackSchema.index(
  {
    category: 1,
    slug: 1,
  },
  {
    unique: true,
  },
);

export const Track = model<ITrackDoc>("Track", trackSchema);

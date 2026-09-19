import { Schema, model } from "mongoose";
import type { ITrackDoc } from "./track.interfaces";

const trackSchema = new Schema<ITrackDoc>(
  {
    category: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Category",
    },
    name: {
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
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Author",
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

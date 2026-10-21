import { Schema, model } from "mongoose";
import type { IMediaDoc, IMediaReference } from "./media.interfaces";
import { MEDIA_STATUS, MEDIA_STATUS_VALUES } from "./media.constants";

const mediaReferenceSchema = new Schema<IMediaReference>(
  {
    entityType: {
      type: String,
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  { _id: false },
);

const mediaSchema = new Schema<IMediaDoc>(
  {
    url: { type: String },
    publicId: {
      type: String,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: MEDIA_STATUS_VALUES,
      default: MEDIA_STATUS.UNATTACHED,
      index: true,
    },
    refCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    references: {
      type: [mediaReferenceSchema],
      default: [],
    },
    uploadedBy: {
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

// High-performance compound index for O(1) garbage collection queries
mediaSchema.index({ status: 1, refCount: 1, updatedAt: 1 });

export const Media = model<IMediaDoc>("Media", mediaSchema);

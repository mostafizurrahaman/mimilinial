import { Schema, model } from "mongoose";
import type { ICollectionDoc } from "./collection.interfaces";

const collectionSchema = new Schema<ICollectionDoc>(
  {
    name: { type: String, required: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: {
      type: String,
      allowNull: true,
    },
    icon: {
      type: String,
      allowNull: true,
    },
    metaTitle: {
      type: String,
      maxLength: 60,
      allowNull: true,
    },
    metaDescription: {
      type: String,
      maxLength: 160,
      allowNull: true,
    },
    ogImage: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Collection = model<ICollectionDoc>("Collection", collectionSchema);

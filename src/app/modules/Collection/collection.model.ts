import { Schema, model } from "mongoose";
import type { ICollectionDoc } from "./collection.interfaces";
import {
   COLLECTION_STATUS,
   COLLECTION_STATUS_VALUES,
} from "./collection.constants";

const collectionSchema = new Schema<ICollectionDoc>(
   {
      nameEn: {
         type: String,
         required: true,
      },
      nameBn: { type: String, required: true },
      slug: {
         type: String,
         required: true,
         unique: true,
         index: true,
         trim: true,
      },
      author: {
         type: Schema.Types.ObjectId,
         ref: "User",
         required: true,
      },
      description: {
         type: String,
         allowNull: true,
         default: null,
      },

      icon: {
         type: String,
         allowNull: true,
         default: null,
      },
      status: {
         type: String,
         enum: COLLECTION_STATUS_VALUES,
         default: COLLECTION_STATUS.DRAFT,
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
   },
   {
      timestamps: true,
      versionKey: false,
   },
);

export const Collection = model<ICollectionDoc>("Collection", collectionSchema);

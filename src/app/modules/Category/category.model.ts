import { Schema, Types, model } from "mongoose";
import type { ICategoryDoc } from "./category.interfaces";

const categorySchema = new Schema<ICategoryDoc>(
   {
      collectionId: {
         type: Schema.Types.ObjectId,
         ref: "Collection",
         required: true,
      },
      name: {
         type: String,
         required: true,
         trim: true,
         lowercase: true,
      },
      slug: {
         type: String,
         required: true,
      },
      icon: {
         type: String,
         allowNull: true,
      },
      description: {
         type: String,
         allowNull: true,
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
      ogImage: {
         type: String,
         allowNull: true,
      },
   },
   {
      timestamps: true,
      versionKey: false,
   },
);

categorySchema.index({ collectionId: 1, slug: 1 }, { unique: true });

export const Category = model<ICategoryDoc>("Category", categorySchema);

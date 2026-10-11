import type { TMulterFile } from "@/app/interfaces/multer.types";
import { Document, Types } from "mongoose";
import type { TCategoryStatusType } from "./category.constants";

export interface ICategory {
   collectionId: Types.ObjectId;
   nameBn: string;
   nameEn: string;
   slug: string;
   icon?: string | null;
   description?: string | null;
   author: Types.ObjectId;
   status: TCategoryStatusType;

   // meta info:
   metaTitle?: string | null;
   metaDescription?: string | null;
   ogImage?: string | null;
   publishedAt: Date | null;
   archivedAt: Date | null;
}

export interface ICategoryDoc extends Document, ICategory {}

export interface ICategoryFiles {
   icon: TMulterFile[];
   ogImage: TMulterFile[];
}

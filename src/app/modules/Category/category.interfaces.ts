import type { TMulterFile } from "@/app/interfaces/multer.types";
import { Document, Types } from "mongoose";

export interface ICategory {
   collectionId: Types.ObjectId;
   name: string;
   slug: string;
   icon?: string | null;
   description?: string | null;
   isActive: boolean;
   author: Types.ObjectId;

   // meta info:
   metaTitle?: string | null;
   metaDescription?: string | null;
   ogImage?: string | null;
}

export interface ICategoryDoc extends Document, ICategory {}

export interface ICategoryFiles {
   icon: TMulterFile[];
   ogImage: TMulterFile[];
}

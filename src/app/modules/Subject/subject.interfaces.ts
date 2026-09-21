import type { TMulterFile } from "@/app/interfaces/multer.types";
import { Document, Types } from "mongoose";

export interface ISubject {
   name_bn: string;
   name_en: string;
   slug: string;
   code: string;
   description?: string | null;
   colorCode: string;
   icon?: string | null;
   sortOrder: number;
   isFeatured: boolean;
   isActive: boolean;
   metaTitle?: string | null;
   metaDescription?: string | null;
   ogImage?: string | null;
   author: Types.ObjectId;
}

export interface ISubjectDoc extends Document, ISubject {}

export interface ISubjectFiles {
   icon: TMulterFile[];
   ogImage: TMulterFile[];
}

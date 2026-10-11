import type { TMulterFile } from "@/app/interfaces/multer.types";
import { Document, Types } from "mongoose";
import type { TSubjectStatus } from "./subject.constants";

export interface ISubject {
   nameBn: string;
   nameEn: string;
   slug: string;
   code: string;
   description?: string | null;
   colorCode: string;
   icon?: string | null;
   sortOrder: number;
   isFeatured: boolean;
   status: TSubjectStatus;
   metaTitle?: string | null;
   metaDescription?: string | null;
   ogImage?: string | null;
   publishedAt?: Date | null;
   archivedAt?: Date | null;
   author: Types.ObjectId;
}

export interface ISubjectDoc extends Document, ISubject {}

export interface ISubjectFiles {
   icon: TMulterFile[];
   ogImage: TMulterFile[];
}

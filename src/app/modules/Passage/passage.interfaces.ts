import { Document, Types } from "mongoose";
import type { TPassageStatusType } from "./passage.constants";
import type { TMulterFile } from "@/app/interfaces/multer.types";

export interface IPassage {
   titleEn: string;
   titleBn: string;
   slug: string;
   bodyBn: string;
   bodyEn: string;
   status: TPassageStatusType;
   mediaUrl?: string | null;
   metaTitle?: string | null;
   ogImage?: string | null;
   metaDescription?: string | null;
   publishedAt?: Date | null;
   archivedAt?: Date | null;
   author: Types.ObjectId;
}

export interface IPassageFile {
   image: TMulterFile[];
   ogImage: TMulterFile[];
}

export interface IPassageDoc extends Document, IPassage {}

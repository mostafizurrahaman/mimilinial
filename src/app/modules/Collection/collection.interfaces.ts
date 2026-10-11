import type { TMulterFile } from "@/app/interfaces/multer.types";
import { Document, Types } from "mongoose";
import type { TCollectionStatus } from "./collection.constants";

export interface ICollection {
   nameBn: string;
   nameEn: string;
   slug: string;
   status: TCollectionStatus;
   description: string;
   author: Types.ObjectId;
   icon?: string | null;

   // meta info:
   metaTitle?: string | null;
   metaDescription?: string | null;
   ogImage?: string | null;
   publishedAt?: Date | null;
   archivedAt?: Date | null;
}

export interface ICollectionFiles {
   icon: TMulterFile[];
   ogImage: TMulterFile[];
}

export interface ICollectionDoc extends Document, ICollection {}

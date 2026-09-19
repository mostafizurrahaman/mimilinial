import type { TMulterFile } from "@/app/interfaces/multer.types";
import { Document, Types } from "mongoose";

export interface ICollection {
   name: string;
   slug: string;
   isActive: boolean;
   description: string;
   author: Types.ObjectId;
   icon?: string | null;

   // meta info:
   metaTitle?: string | null;
   metaDescription?: string | null;
   ogImage?: string | null;
}

export interface ICollectionFiles {
   icon: TMulterFile[];
   ogImage: TMulterFile[];
}

export interface ICollectionDoc extends Document, ICollection {}

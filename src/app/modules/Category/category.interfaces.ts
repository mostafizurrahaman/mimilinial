import { Document, Types } from "mongoose";

export interface ICategory {
   collectionId: Types.ObjectId;
   name: string;
   slug: string;
   icon?: string | null;
   description?: string | null;
   isActive: boolean;
   author: Types.ObjectId;
}

export interface ICategoryDoc extends Document, ICategory {}

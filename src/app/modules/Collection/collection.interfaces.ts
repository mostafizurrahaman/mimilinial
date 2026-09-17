import { Document, Types } from "mongoose";

export interface ICollection {
   name: string;
   slug: string;
   isActive: boolean;
   author: Types.ObjectId;
   icon?: string | null;
}

export interface ICollectionDoc extends Document, ICollection {}

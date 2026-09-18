import { Document, Types } from "mongoose";

export interface ICollection {
   name: string;
   slug: string;
   isActive: boolean;
   description: string;
   author: Types.ObjectId;
   icon?: string | null;
}

export interface ICollectionDoc extends Document, ICollection {}

import { Document, Types } from "mongoose";

export interface ITrack {
   category: Types.ObjectId;
   name: string;
   slug: string;
   description?: string | null;
   isActive: boolean;
   author: Types.ObjectId;
}

export interface ITrackDoc extends Document, ITrack {}

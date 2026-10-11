import { Document, Types } from "mongoose";
import type { TTrackStatusType } from "./track.constants";

export interface ITrack {
  category: Types.ObjectId;
  nameEn: string;
  nameBn: string;
  slug: string;
  description?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  status: TTrackStatusType;
  author: Types.ObjectId;
  publishedAt?: Date | null;
  archivedAt?: Date | null;
}

export interface ITrackDoc extends Document, ITrack {}

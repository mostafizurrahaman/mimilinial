import { Document, Types } from "mongoose";
import type { TTopicStatus } from "./topic.constants";

export interface ITopic {
  subject: Types.ObjectId;
  parentTopic: Types.ObjectId | null;

  // topic name:
  nameBn: string;
  nameEn: string;
  slug: string;
  iconUrl?: string | null;
  descriptionBn?: string | null;
  descriptionEn?: string | null;
  sortOrder: number;
  depth: number; // New Topic Depth = Parent Depth + 1

  status: TTopicStatus;

  // description:
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImage?: string | null;

  publishedAt?: Date | null;
  archivedAt?: Date | null;
  author: Types.ObjectId;
}

export interface ITopicDoc extends Document, ITopic {}

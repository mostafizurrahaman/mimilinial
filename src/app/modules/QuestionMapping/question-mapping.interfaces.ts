import { Document, Types } from "mongoose";

export interface IQuestionMapping {
  question: Types.ObjectId;
  // Classification Hierarchy
  coll: Types.ObjectId;
  category: Types.ObjectId;
  track?: Types.ObjectId | null;

  // Academic Hierarchy:
  subject: Types.ObjectId;
  topic: Types.ObjectId;

  // Previous Question Reference:
  pastExam?: Types.ObjectId | null;
  year?: string | null;

  // Marking and Order:
  marks: number;
  sortOrder: number;

  // Created BY
  author: Types.ObjectId;
}

export interface IQuestionMappingDoc extends Document, IQuestionMapping {}

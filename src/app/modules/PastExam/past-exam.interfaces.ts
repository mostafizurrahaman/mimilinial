import { Document, Types } from "mongoose";
import type { TExamStatusType } from "./past-exam.constants";

export interface IPastExam {
  category: Types.ObjectId;
  track?: Types.ObjectId | null;
  nameEn: string;
  nameBn: string;
  slug: string;
  year: string;
  totalQuestions: number;
  mappedQuestions: number;
  description?: string | null;
  status: TExamStatusType;
  durationMins: number; 
  examDate?: Date | null; 
  publishedAt?: Date | null;
  archivedAt?: Date | null;
  author: Types.ObjectId;
}

export interface IPastExamDoc extends Document, IPastExam {}

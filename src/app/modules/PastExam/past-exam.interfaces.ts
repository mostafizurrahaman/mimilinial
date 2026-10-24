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
  description?: string;
  status: TExamStatusType;
  author: Types.ObjectId;
}

export interface IPastExamDoc extends Document, IPastExam {}

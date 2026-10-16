import { Document, Types } from "mongoose";
import type { TQuestionVersionLanguageType } from "./question-version.constants";
import type { TQuestionType } from "../Questions";

// MCQ (Single & Multiple) && TRUE_FALSE:
export interface IQuestionOption {
  sortOrder: number;
  content: string;
  mediaUrl?: string | null;
  isCorrect: boolean;
}

// MATCHING (PAIR)
export interface IMatchingPair {
  left: string;
  right: string;
}

// ORDER :
export interface IOrderingItem {
  text: string;
  correctOrder: number;
}

export interface IQuestionVersion {
  type: TQuestionType;
  question: Types.ObjectId;
  versionNumber: number;
  isCurrent: boolean;
  stem: string;
  planStem: string;
  contentHash: string;
  language: TQuestionVersionLanguageType;
  explanation?: string | null;
  mediaUrl?: string | null;
  changeLog?: string | null;
  author: Types.ObjectId;
}

// TYPE WISE Question VERSION:

// 1. SINGLE ANSWER MCQ:
export interface ISingleMcqVersion extends IQuestionVersionDoc {
  type: "single_mcq";
  options: IQuestionOption[];
}

// 2. MULTIPLE CHOICE :
export interface IMultiMcqVersion extends IQuestionVersionDoc {
  type: "multi_mcq";
  options: IQuestionOption[];
}

// 3. TRUE / FALSE
export interface ITrueFalseVersion extends IQuestionVersionDoc {
  type: "true_false";
  options: IQuestionOption[];
}

// 4. Fill in the blank:
export interface IFillBlankVersion extends IQuestionVersionDoc {
  type: "fill_blank";
  acceptedAnswers: string[];
  isCaseSensitive: boolean;
}

// 5. Matching:
export interface IMatchingVersion extends IQuestionVersionDoc {
  type: "matching";
  pairs: IMatchingPair[];
}

// 6. ORDERING ITEMS:
export interface IOrderingVersion extends IQuestionVersionDoc {
  type: "ordering";
  orderingItems: IOrderingItem[];
}

export interface IQuestionVersionDoc extends Document, IQuestionVersion {}
export type TAnyQuestionVersionDoc =
  | ISingleMcqVersion
  | IMultiMcqVersion
  | ITrueFalseVersion
  | IFillBlankVersion
  | IMatchingVersion
  | IOrderingVersion;

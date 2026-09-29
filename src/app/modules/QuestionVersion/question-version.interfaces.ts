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
   correct_order: number;
}

export interface IQuestionVersion {
   type: TQuestionType;
   question: Types.ObjectId;
   version_number: number;
   isCurrent: boolean;
   stem: string;
   language: TQuestionVersionLanguageType;
   explanation?: string | null;
   mediaUrl?: string | null;
   changeLog?: string | null;
   author: Types.ObjectId;
}

export interface IQuestionVersionDoc extends IQuestionVersion, Document {}

// TYPE WISE Question VERSION:

// 1. SINGLE ANSWER MCQ:
export interface ISingleMcqVersion extends IQuestionVersionDoc {
   options: IQuestionOption[];
}

// 2. MULTIPLE CHOICE :
export interface IMultiMcqVersion extends IQuestionVersionDoc {
   options: IQuestionOption[];
}

// 3. TRUE / FALSE
export interface ITrueFalseVersion extends IQuestionVersionDoc {
   options: IQuestionOption[];
}

// 4. Fill in the blank:
export interface IFillBlankVersion extends IQuestionVersionDoc {
   accepted_answers: string[];
   is_case_sensitive: boolean;
}

// 5. Matching:
export interface IMatchingVersion extends IQuestionVersionDoc {
   pairs: IMatchingPair[];
}

// 6. ORDERING ITEMS:
export interface IOrderingVersion extends IQuestionVersionDoc {
   type: "ordering";
   ordering_items: IOrderingItem[];
}

export interface IQuestionVersionDoc extends Document, IQuestionVersion {}

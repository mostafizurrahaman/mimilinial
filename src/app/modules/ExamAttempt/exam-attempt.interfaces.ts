import { Document, Types } from "mongoose";
import type { TExamAttemptStatus } from "./exam-attempt.constants";

// 1. Common Field (Base):
export interface IBaseAttemptItem {
  mappingId: Types.ObjectId;
  questionId: Types.ObjectId;
  versionId?: Types.ObjectId | null;
  isAnswered: boolean;
  isMarkedForReview: boolean;
  timeSpentSeconds: number;
}

// 2. Discriminator Interfaces:

// (a) Single MCQ & True/False Discriminator:
export interface ISingleMcqAttemptItem extends IBaseAttemptItem {
  questionType: "single_mcq" | "true_false";
  userAnswer?: Types.ObjectId | null;
}

// (b) Multiple MCQ:
export interface IMultiMcqAttemptItem extends IBaseAttemptItem {
  questionType: "multi_mcq" | "multiple_mcq";
  userAnswer?: Types.ObjectId[];
}

// (c) Fill in the Blank:
export interface IFillBlankAttemptItem extends IBaseAttemptItem {
  questionType: "fill_blank";
  userAnswer?: string | null;
}

// (d) Matching:
export interface IMatchingPairAnswer {
  left: string;
  right: string;
}

export interface IMatchingAttemptItem extends IBaseAttemptItem {
  questionType: "matching";
  userAnswer?: IMatchingPairAnswer[];
}

// (e) Ordering:
export interface IOrderingAttemptItem extends IBaseAttemptItem {
  questionType: "ordering";
  userAnswer?: string[];
}

// 🎯 Discriminated Union of Question Items
export type TAttemptItem =
  | ISingleMcqAttemptItem
  | IMultiMcqAttemptItem
  | IFillBlankAttemptItem
  | IMatchingAttemptItem
  | IOrderingAttemptItem;

// 3. Self-Practice Configuration
export interface ISelfPracticeConfig {
  category?: Types.ObjectId | null;
  subject?: Types.ObjectId | null;
  topics?: Types.ObjectId[];
  totalQuestions: number;
  durationMins: number;
}

// 4. Main Exam Attempt Interface
export interface IExamAttempt {
  user: Types.ObjectId;
  isSelfPractice: boolean;
  examId?: Types.ObjectId | null;
  attemptNumber: number;

  selfPracticeConfig?: ISelfPracticeConfig | null;

  status: TExamAttemptStatus;
  startDate: Date;
  expiresAt: Date;
  submittedAt?: Date | null;
  totalTimeTakenSeconds: number;

  // Questions served in this attempt
  questions: TAttemptItem[];

  // Anti-cheating & Audit
  tabSwitchedCount: number;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface IExamAttemptDoc extends Document, IExamAttempt {}

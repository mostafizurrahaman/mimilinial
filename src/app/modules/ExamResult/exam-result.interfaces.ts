import { Document, Types } from "mongoose";

export interface ISubjectScoreSummary {
  subjectId: Types.ObjectId;
  subjectName?: string;
  total: number;
  answered: number;
  correct: number;
  wrong: number;
  score: number;
}

export interface IExamResult {
  attemptId: Types.ObjectId;
  examId?: Types.ObjectId | null;
  user: Types.ObjectId;
  isSelfPractice: boolean;

  // Scorecard
  totalQuestions: number;
  totalAnswered: number;
  totalSkipped: number;
  correctCount: number;
  wrongCount: number;

  obtainedMarks: number;
  deductedMarks: number;
  finalScore: number;
  percentage: number;
  isPassed: boolean;
  rank?: number | null;

  subjectBreakdown: ISubjectScoreSummary[];
  totalTimeTakenSeconds: number;
}

export interface IExamResultDoc extends Document, IExamResult {}

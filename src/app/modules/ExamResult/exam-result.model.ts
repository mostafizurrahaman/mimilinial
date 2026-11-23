import { Schema, model } from "mongoose";
import type {
  IExamResultDoc,
  ISubjectScoreSummary,
} from "./exam-result.interfaces";
import { formatDisplayTime } from "./exam-result.utils";

const subjectScoreSchema = new Schema<ISubjectScoreSummary>(
  {
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    subjectName: {
      type: String,
      default: "Subject",
    },
    total: {
      type: Number,
      required: true,
      default: 0,
    },
    answered: {
      type: Number,
      required: true,
      default: 0,
    },
    correct: {
      type: Number,
      required: true,
      default: 0,
    },
    wrong: {
      type: Number,
      required: true,
      default: 0,
    },
    score: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false },
);

const examResultSchema = new Schema<IExamResultDoc>(
  {
    attemptId: {
      type: Schema.Types.ObjectId,
      ref: "ExamAttempt",
      required: true,
      unique: true,
      index: true,
    },
    examId: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      default: null,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isSelfPractice: {
      type: Boolean,
      default: false,
      index: true,
    },

    totalQuestions: {
      type: Number,
      required: true,
    },
    totalAnswered: {
      type: Number,
      required: true,
      default: 0,
    },
    totalSkipped: {
      type: Number,
      required: true,
      default: 0,
    },
    correctCount: {
      type: Number,
      required: true,
      default: 0,
    },
    wrongCount: {
      type: Number,
      required: true,
      default: 0,
    },

    obtainedMarks: {
      type: Number,
      required: true,
      default: 0,
    },
    deductedMarks: {
      type: Number,
      required: true,
      default: 0,
    },
    finalScore: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },
    percentage: {
      type: Number,
      required: true,
      default: 0,
    },
    isPassed: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    rank: {
      type: Number,
      default: null,
      index: true,
    },

    subjectBreakdown: [subjectScoreSchema],
    totalTimeTakenSeconds: {
      type: Number,
      required: true,
      default: 0,
    },
    totalTimeTakenMinutes: {
      type: Number,
      default: 0,
    },
    displayTotalTimeTaken: {
      type: String,
      default: "0s",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

examResultSchema.pre("save", function () {
  if (this.totalTimeTakenSeconds !== undefined) {
    this.totalTimeTakenMinutes =
      Math.round((this.totalTimeTakenSeconds / 60) * 100) / 100;
    this.displayTotalTimeTaken = formatDisplayTime(this.totalTimeTakenSeconds);
  }
});

// Compound Index for Leaderboard (Blazing fast sorted queries)
examResultSchema.index({
  examId: 1,
  finalScore: -1,
  wrongCount: 1,
  totalTimeTakenSeconds: 1,
});

// User's result history index
examResultSchema.index({ user: 1, createdAt: -1 });

export const ExamResult = model<IExamResultDoc>("ExamResult", examResultSchema);

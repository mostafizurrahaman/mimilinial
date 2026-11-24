import { Schema, model } from "mongoose";
import type { IUserMasteryDoc } from "./user-mastery.interfaces";
import {
  MASTERY_LEVEL,
  masteryLevelValues,
} from "./user-mastery.constants";

const userMasterySchema = new Schema<IUserMasteryDoc>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    topic: {
      type: Schema.Types.ObjectId,
      ref: "Topic",
      required: true,
      index: true,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },

    totalQuestionsAttempted: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalCorrect: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalWrong: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    accuracyPercentage: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
    masteryLevel: {
      type: String,
      enum: masteryLevelValues,
      default: MASTERY_LEVEL.AVERAGE,
      index: true,
    },

    lastAttemptedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound Unique Index: One mastery record per user per topic
userMasterySchema.index({ user: 1, topic: 1 }, { unique: true });

// Compound Index for fast queries
userMasterySchema.index({ user: 1, masteryLevel: 1, accuracyPercentage: 1 });
userMasterySchema.index({ user: 1, subject: 1 });

// Pre-save hook: Automatically compute accuracy and level
userMasterySchema.pre("save", function () {
  if (this.totalQuestionsAttempted > 0) {
    this.accuracyPercentage =
      Math.round(
        (this.totalCorrect / this.totalQuestionsAttempted) * 10000,
      ) / 100;
  } else {
    this.accuracyPercentage = 0;
  }

  if (this.accuracyPercentage < 60) {
    this.masteryLevel = MASTERY_LEVEL.WEAK;
  } else if (this.accuracyPercentage < 75) {
    this.masteryLevel = MASTERY_LEVEL.AVERAGE;
  } else if (this.accuracyPercentage < 90) {
    this.masteryLevel = MASTERY_LEVEL.STRONG;
  } else {
    this.masteryLevel = MASTERY_LEVEL.MASTERED;
  }
});

export const UserMastery = model<IUserMasteryDoc>(
  "UserMastery",
  userMasterySchema,
);

import { Document, Types } from "mongoose";
import type { TMasteryLevel } from "./user-mastery.constants";

export interface IUserMastery {
  user: Types.ObjectId;
  topic: Types.ObjectId;
  subject: Types.ObjectId;

  totalQuestionsAttempted: number;
  totalCorrect: number;
  totalWrong: number;
  accuracyPercentage: number;
  masteryLevel: TMasteryLevel;

  lastAttemptedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserMasteryDoc extends Document, IUserMastery {}

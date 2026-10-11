import { Document, Types } from "mongoose";
import type {
   TQuestionDifficultyType,
   TQuestionStatusType,
   TQuestionType,
} from "./questions.constants";

export interface IQuestion {
   code: string;
   slug: string;
   type: TQuestionType;
   difficulty: TQuestionDifficultyType;
   status: TQuestionStatusType;
   passageId?: Types.ObjectId | null;
   isFlagged: boolean;
   author: Types.ObjectId;
}

export interface IQuestionDoc extends Document, IQuestion {}

// https://yarnpkg.com/package?name=bangla-to-banglish

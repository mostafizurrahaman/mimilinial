import { Document, Types } from "mongoose";
import type {
  TExamLevelType,
  TExamType,
  TGenerationModeType,
  TExamStatusType,
} from "./exam.constants";

export interface IExam {
  title: string;
  slug: string;
  description?: string | null;

  // 1. Exam Level
  examLevel: TExamLevelType;

  // 2. Syllabus Hierarchy
  category: Types.ObjectId;             // Required for all levels
  track?: Types.ObjectId | null;        // Used when examLevel === "track"
  subject?: Types.ObjectId | null;      // Used when examLevel is "subject" or "topic"
  topics?: Types.ObjectId[];            // Used when examLevel === "topic" (multiple topics)

  // 3. Question Generation Mode
  generationMode: TGenerationModeType;

  // 4. Time and Marks Settings
  durationMins: number;                 // Total exam duration in minutes
  totalQuestions: number;               // Total question count
  marksPerQuestion: number;             // Mark allocated for each question
  negativeMarks: number;                // Marks deducted for each wrong answer
  totalMarks: number;                   // Full marks (totalQuestions * marksPerQuestion)
  passMarks: number;                    // Minimum marks required to pass

  // 5. Question Mappings
  questionMappings: Types.ObjectId[];   // List of QuestionMapping IDs

  // 6. Configurations
  isRandomized: boolean;                // Whether question sequence is randomized
  isOptionShuffled: boolean;            // Whether option choices are shuffled
  isSpeedTest: boolean;                 // Whether this is designated as a speed test

  // 7. Schedule & Type
  examType: TExamType;
  startTime?: Date | null;              // Live exam start window
  endTime?: Date | null;                // Live exam end window

  // 8. Status & Audit
  status: TExamStatusType;
  author: Types.ObjectId;
  editor?: Types.ObjectId | null;
}

export interface IExamDoc extends Document, IExam {}

// Typed Discriminator Interfaces
export interface ICategoryExamDoc extends IExamDoc {
  examLevel: "category";
}

export interface ITrackExamDoc extends IExamDoc {
  examLevel: "track";
  track: Types.ObjectId;
}

export interface ISubjectExamDoc extends IExamDoc {
  examLevel: "subject";
  subject: Types.ObjectId;
}

export interface ITopicExamDoc extends IExamDoc {
  examLevel: "topic";
  subject: Types.ObjectId;
  topics: Types.ObjectId[];
}

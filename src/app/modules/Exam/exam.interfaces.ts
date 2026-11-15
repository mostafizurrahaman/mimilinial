import { Document, Types } from 'mongoose';
import type { TExamLevelType, TExamType, TGenerationModeType } from './exam.constants';
import type { TExamStatusType } from '../PastExam';

export interface IExam {
  title: string; // exam title
  slug: string; 
  description: string; 

  // Exam level: 
  examLevel: TExamLevelType; 

  // Syllabus Hirarchy
  category?: Types.ObjectId | null; 
  track?: Types.ObjectId | null; 
  subject?: Types.ObjectId | null; 
  topic?: Types.ObjectId | null; 

  // Generation Mode: 
   generationMode: TGenerationModeType

  // Time And Marks Settings: 
  durationMins: number;  // total exam time
  totalQuestions: number; // total question
  marksPerQuestions: number;  // each question mark
  negativeMarks: number; // each wrong answer minus this mark
  totalMarks: number; // total mark
  passMarks: number; // pass mark

  // Question mappings: 
  questionMappings: Types.ObjectId[]; // total mapped question

  // Configuration: 
  isRandomized: boolean; // question randomized
  isOptionShuffled: boolean; // question option shuffled 
  isSpeedTest: boolean; // speed test. 

  // Schedule and Status: 
  examType: TExamType
  startTime?: Date | null; // start time
  endTime?: Date | null; // end time 

  // Exam Status: 
  status:  TExamStatusType 
  author: Types.ObjectId; // exam author 
  editor: Types.ObjectId | null; // exam editor 
}

export interface IExamDoc extends Document, IExam {}

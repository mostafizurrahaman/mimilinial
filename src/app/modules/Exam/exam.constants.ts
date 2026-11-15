export const examSearchableFields = ['name'] as const;
export const examSortableFields = ['createdAt', 'updatedAt'] as const;

// Exam Level: 
export const EXAM_LEVEL = {
    CATEGORY: "category", 
    TRACK: "topic", 
    SUBJECT: 'subject', 
    TOPIC: "topic"
} as const; 
export const examLevelValues = Object.values(EXAM_LEVEL)
export type TExamLevelType = typeof EXAM_LEVEL[keyof typeof EXAM_LEVEL]

// Generation mode: 
export const GENERATION_MODE = {
    RANDOM: "random", 
    MANUAL: "manual"  
}  as const; 
export const generationModeValues = Object.values(GENERATION_MODE)
export type TGenerationModeType = typeof GENERATION_MODE[keyof typeof GENERATION_MODE]

// Exam Type: 
export const EXAM_TYPE = {
  LIVE: "live",             // 1. Schedule Live exam (Start and End time)
  MODEL_TEST: "model_test", // 2. Model test (Student can attend any time)
  ARCHIVE: "archive",       // 3. Past live exam.
} as const;

export type TExamType = (typeof EXAM_TYPE)[keyof typeof EXAM_TYPE];


// Exam Status: 
export const EXAM_STATUS = {
    DRAFT: "draft", 
    PUBLISHED: "published",
    ARCHIVED: "archived"
}

export type TExamSearchableField = (typeof examSearchableFields)[number];
export type TExamSortableField = (typeof examSortableFields)[number];

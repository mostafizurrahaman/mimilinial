export const examSearchableFields = ["title", "slug"] as const;
export const examSortableFields = [
  "createdAt",
  "updatedAt",
  "totalMarks",
  "durationMins",
] as const;

// 1. Exam Level
export const EXAM_LEVEL = {
  CATEGORY: "category",
  SUBJECT: "subject",
  TOPIC: "topic",
} as const;

export const examLevelValues = Object.values(EXAM_LEVEL);
export type TExamLevelType = (typeof EXAM_LEVEL)[keyof typeof EXAM_LEVEL];

// 2. Generation Mode
export const GENERATION_MODE = {
  RANDOM: "random",
  MANUAL: "manual",
} as const;

export const generationModeValues = Object.values(GENERATION_MODE);
export type TGenerationModeType =
  (typeof GENERATION_MODE)[keyof typeof GENERATION_MODE];

// 3. Exam Type
export const EXAM_TYPE = {
  LIVE: "live",             // Scheduled live exam with strict start and end window
  MODEL_TEST: "model_test", // Open practice model test (students can attend anytime)
  ARCHIVE: "archive",       // Past live exam converted to archive
} as const;

export const examTypeValues = Object.values(EXAM_TYPE);
export type TExamType = (typeof EXAM_TYPE)[keyof typeof EXAM_TYPE];

// 4. Exam Status
export const EXAM_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export const examStatusValues = Object.values(EXAM_STATUS);
export type TExamStatusType = (typeof EXAM_STATUS)[keyof typeof EXAM_STATUS];

export type TExamSearchableField = (typeof examSearchableFields)[number];
export type TExamSortableField = (typeof examSortableFields)[number];

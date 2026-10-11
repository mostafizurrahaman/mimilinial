export const questionsSearchableFields = ["name"] as const;
export const questionsSortableFields = ["createdAt", "updatedAt"] as const;

export const QUESTION_STATUS = {
   DRAFT: "draft",
   PUBLISHED: "published",
   ARCHIVED: "archived",
} as const;

export const QUESTION_DIFFICULTY = {
   EASY: "easy",
   MEDIUM: "medium",
   HARD: "hard",
} as const;

export const QUESTION_TYPE = {
   SINGLE_MCQ: "single_mcq",
   MULTI_MCQ: "multi_mcq",
   TRUE_FALSE: "true_false",
   FILL_BLANK: "fill_blank",
   MATCHING: "matching",
   ORDERING: "ordering",
} as const;

export const QUESTION_STATUS_VALUES = Object.values(QUESTION_STATUS);

export const QUESTION_DIFFICULTY_VALUES = Object.values(QUESTION_DIFFICULTY);

export const QUESTION_TYPE_VALUES = Object.values(QUESTION_TYPE);

export type TQuestionsSearchableField =
   (typeof questionsSearchableFields)[number];
export type TQuestionsSortableField = (typeof questionsSortableFields)[number];

export type TQuestionStatusType =
   (typeof QUESTION_STATUS)[keyof typeof QUESTION_STATUS];
export type TQuestionDifficultyType =
   (typeof QUESTION_DIFFICULTY)[keyof typeof QUESTION_DIFFICULTY];
export type TQuestionType = (typeof QUESTION_TYPE)[keyof typeof QUESTION_TYPE];

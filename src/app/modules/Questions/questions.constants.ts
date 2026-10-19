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

export const questionVersionSearchableFields = ["name"] as const;
export const questionVersionSortableFields = [
  "createdAt",
  "updatedAt",
] as const;

export const QUESTION_CODE_REGEX = /^Q-\d{6}$/;

export const QUESTION_VERSION_LANGUAGE = {
  BANGLA: "bn",
  ENGLISH: "en",
} as const;
export const QuestionVersionLanguageValues = Object.values(
  QUESTION_VERSION_LANGUAGE,
);
export type TQuestionVersionSearchableField =
  (typeof questionVersionSearchableFields)[number];
export type TQuestionVersionSortableField =
  (typeof questionVersionSortableFields)[number];
export type TQuestionVersionLanguageType =
  (typeof QUESTION_VERSION_LANGUAGE)[keyof typeof QUESTION_VERSION_LANGUAGE];

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

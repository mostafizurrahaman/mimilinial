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

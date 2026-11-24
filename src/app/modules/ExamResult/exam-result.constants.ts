export const examResultSearchableFields = ["examTitle"] as const;

export const examResultSortableFields = [
  "createdAt",
  "updatedAt",
  "finalScore",
  "percentage",
  "totalTimeTakenSeconds",
  "rank",
  "correctCount",
  "wrongCount",
] as const;

export type TExamResultSearchableField =
  (typeof examResultSearchableFields)[number];
export type TExamResultSortableField =
  (typeof examResultSortableFields)[number];

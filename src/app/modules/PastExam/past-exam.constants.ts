import type { keyof } from "zod";

export const EXAM_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export const EXAM_STATUS_VALUES = Object.values(EXAM_STATUS);

export const pastExamSearchableFields = ["name"] as const;
export const pastExamSortableFields = ["createdAt", "updatedAt"] as const;

export type TPastExamSearchableField =
  (typeof pastExamSearchableFields)[number];
export type TPastExamSortableField = (typeof pastExamSortableFields)[number];
export type TExamStatusType = (typeof EXAM_STATUS)[keyof typeof EXAM_STATUS];

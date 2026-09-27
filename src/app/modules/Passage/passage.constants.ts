export const passageSearchableFields = ["name"] as const;
export const passageSortableFields = ["createdAt", "updatedAt"] as const;

export const PASSAGE_STATUS = {
   DRAFT: "draft",
   PUBLISHED: "published",
   ARCHIVED: "archived",
} as const;

export const PASSAGE_STATUS_VALUES = Object.values(PASSAGE_STATUS);

export type TPassageSearchableField = (typeof passageSearchableFields)[number];
export type TPassageSortableField = (typeof passageSortableFields)[number];
export type TPassageStatusType =
   (typeof PASSAGE_STATUS)[keyof typeof PASSAGE_STATUS];

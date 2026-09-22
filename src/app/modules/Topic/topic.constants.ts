export const topicSearchableFields = [
  "nameEn",
  "nameBn",
  "description",
  "subjectName",
  "slug",
  "subjectSlug",
] as const;

export const TOPIC_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export const TOPIC_VALUES = Object.values(TOPIC_STATUS);

export const topicSortableFields = [
  "createdAt",
  "updatedAt",
  "nameEn",
  "nameBn",
  "status",
  "sortOrder",
  "depth",
  "subjectName",
  "publishedAt",
  "archivedAt",
] as const;

export type TTopicSearchableField = (typeof topicSearchableFields)[number];
export type TTopicSortableField = (typeof topicSortableFields)[number];
export type TTopicStatus = (typeof TOPIC_STATUS)[keyof typeof TOPIC_STATUS];

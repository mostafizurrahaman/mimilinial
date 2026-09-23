export const trackSearchableFields = [
  "status",
  "name",
  "description",
  "categoryName",
  "collectionName",
  "slug",
  "categorySlug",
  "collectionSlug",
] as const;

export const trackSortableFields = [
  "createdAt",
  "updatedAt",
  "name",
  "slug",
  "categoryName",
  "status",
] as const;

export const trackStatus = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export const trackStatusValues = Object.values(trackStatus);

export type TTrackSearchableField = (typeof trackSearchableFields)[number];
export type TTrackSortableField = (typeof trackSortableFields)[number];

export type TTrackStatusType = (typeof trackStatus)[keyof typeof trackStatus];

export const categorySearchableFields = [
   "name",
   "description",
   "collectionName",
   "collectionSlug",
] as const;
export const categorySortableFields = [
   "createdAt",
   "updatedAt",
   "name",
] as const;

export type TCategorySearchableField =
   (typeof categorySearchableFields)[number];
export type TCategorySortableField = (typeof categorySortableFields)[number];

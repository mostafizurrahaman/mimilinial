export const collectionSearchableFields = [
   "name",
   "slug",
   "description",
   // "authorEmail",
] as const;
export const collectionSortableFields = [
   "createdAt",
   "updatedAt",
   "name",
] as const;

export type TCollectionSearchableField =
   (typeof collectionSearchableFields)[number];
export type TCollectionSortableField =
   (typeof collectionSortableFields)[number];

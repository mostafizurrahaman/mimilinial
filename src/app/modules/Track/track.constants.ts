export const trackSearchableFields = ["name", "description"] as const;
export const trackSortableFields = [
   "createdAt",
   "updatedAt",
   "name",
   "categoryName",
] as const;

export type TTrackSearchableField = (typeof trackSearchableFields)[number];
export type TTrackSortableField = (typeof trackSortableFields)[number];

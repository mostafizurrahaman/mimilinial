export const trackSearchableFields = ["name", "description"] as const;
export const trackSortableFields = ["createdAt", "updatedAt"] as const;

export type TTrackSearchableField = (typeof trackSearchableFields)[number];
export type TTrackSortableField = (typeof trackSortableFields)[number];

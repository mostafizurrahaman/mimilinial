export const mediaSearchableFields = ["url", "publicId", "status"] as const;
export const mediaSortableFields = [
  "publicId",
  "createdAt",
  "updateadAt",
  "status",
] as const;

export type TMediaSearchableField = (typeof mediaSearchableFields)[number];
export type TMediaSortableField = (typeof mediaSortableFields)[number];

export const MEDIA_STATUS = {
  UNATTACHED: "unattached",
  ATTACHED: "attached",
} as const;

export const MEDIA_STATUS_VALUES = Object.values(MEDIA_STATUS);

export type TMediaStatus = (typeof MEDIA_STATUS)[keyof typeof MEDIA_STATUS];

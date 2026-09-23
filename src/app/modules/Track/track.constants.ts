export const trackSearchableFields = [
  "nameBn",
  "nameEn",
  "description",
  "categoryNameEn",
  "categoryNameBn",
  "collectionNameEn",
  "collectionNameBn",
] as const;

export const trackSortableFields = [
  "nameBn",
  "nameEn",
  "status",
  "categoryStatus",
  "collectionStatus",
  "publishedAt",
  "archivedAt",
  "createdAt",
  "updatedAt",
] as const;

export const trackStatus = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export const trackStatusValues = Object.values(trackStatus);

export const trackProjectTypes = ["list", "options", "details"] as const;

export const trackProjection = {
  options: {
    _id: 0,
    trackId: "$_id",
    nameBn: "$nameBn",
    nameEn: "$nameEn",
    status: "$status",
    categoryStatus: "$categoryDetails.status",
    collectionStatus: "$categoryDetails.collectionStatus",
    icon: { $ifNull: ["$icon", null] },
  },

  list: {
    _id: 0,
    trackId: "$_id",
    categoryId: "$categoryDetails._id",
    collectionId: "$categoryDetails.collectionId",
    nameBn: "$nameBn",
    nameEn: "$nameEn",
    status: "$status",

    categoryStatus: "$categoryDetails.status",
    collectionStatus: "$categoryDetails.collectionStatus",

    icon: { $ifNull: ["$icon", null] },
    categoryNameEn: "$categoryDetails.nameEn",
    categoryNameBn: "$categoryDetails.nameBn",

    collectionNameEn: "$categoryDetails.collectionNameEn",
    collectionNameBn: "$categoryDetails.collectionNameBn",

    publishedAt: { $ifNull: ["$publishedAt", null] },
    archivedAt: { $ifNull: ["$archivedAt", null] },

    createdAt: "$createdAt",
    updatedAt: "$updatedAt",
  },

  details: {
    _id: 0,
    trackId: "$_id",
    categoryId: "$categoryDetails._id",
    collectionId: "$categoryDetails.collectionId",
    icon: { $ifNull: ["$icon", null] },
    nameBn: "$nameBn",
    nameEn: "$nameEn",
    status: "$status",
    categoryStatus: "$categoryDetails.status",
    collectionStatus: "$categoryDetails.collectionStatus",
    description: { $ifNull: ["$description", null] },
    metaTitle: { $ifNull: ["$metaTitle", null] },
    metaDescription: { $ifNull: ["$metaDescription", null] },
    ogImage: { $ifNull: ["$ogImage", null] },
    author: "$author",
    categoryNameEn: "$categoryDetails.nameEn",
    categoryNameBn: "$categoryDetails.nameBn",
    collectionNameEn: "$categoryDetails.collectionNameEn",
    collectionNameBn: "$categoryDetails.collectionNameBn",
    publishedAt: { $ifNull: ["$publishedAt", null] },
    archivedAt: { $ifNull: ["$archivedAt", null] },
    createdAt: "$createdAt",
    updatedAt: "$updatedAt",
  },
} as const;

export type TTrackSearchableField = (typeof trackSearchableFields)[number];
export type TTrackSortableField = (typeof trackSortableFields)[number];

export type TTrackStatusType = (typeof trackStatus)[keyof typeof trackStatus];

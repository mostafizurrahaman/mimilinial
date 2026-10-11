export const categorySearchableFields = [
  "nameBn",
  "nameEn",
  "slug",
  "description",
  "collectionName",
  "collectionSlug",
] as const;
export const categorySortableFields = [
  "createdAt",
  "nameEn",
  "nameBn",
  "status",
  "collectionStatus",
  "publishedAt",
  "archivedAt",
] as const;

export const categoryStatus = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export const categoryProjectionValues = ["list", "options", "details"] as const;

export const categoryProjection = {
  list: {
    _id: 0,
    categoryId: "$_id",
    nameBn: "$nameBn",
    nameEn: "$nameEn",
    slug: "$slug",

    icon: { $ifNull: ["$icon", null] },
    ogImage: { $ifNull: ["$ogImage", null] },

    status: "$status",

    collectionId: "$collectionId",
    collectionName: "$collectionDetails.name",
    collectionSlug: "$collectionDetails.slug",
    collectionIcon: {
      $ifNull: ["$collectionDetails.icon", null],
    },
    collectionStatus: "$collectionDetails.status",

    publishedAt: "$publishedAt",
    archivedAt: "$archivedAt",

    createdAt: "$createdAt",
    updatedAt: "$updatedAt",
  },

  options: {
    _id: 0,
    categoryId: "$_id",
    nameBn: "$nameBn",
    nameEn: "$nameEn",
    slug: "$slug",

    icon: { $ifNull: ["$icon", null] },
    status: "$status",

    collectionId: "$collectionId",
    collectionName: "$collectionDetails.name",
  },

  details: {
    _id: 0,
    categoryId: "$_id",

    nameBn: "$nameBn",
    nameEn: "$nameEn",
    slug: "$slug",

    description: {
      $ifNull: ["$description", null],
    },

    icon: { $ifNull: ["$icon", null] },
    ogImage: { $ifNull: ["$ogImage", null] },

    metaTitle: {
      $ifNull: ["$metaTitle", null],
    },

    metaDescription: {
      $ifNull: ["$metaDescription", null],
    },

    status: "$status",

    author: "$author",

    collectionId: "$collectionId",
    collectionName: "$collectionDetails.name",
    collectionSlug: "$collectionDetails.slug",
    collectionIcon: {
      $ifNull: ["$collectionDetails.icon", null],
    },
    collectionStatus: "$collectionDetails.status",

    publishedAt: "$publishedAt",
    archivedAt: "$archivedAt",

    createdAt: "$createdAt",
    updatedAt: "$updatedAt",
  },
} as const;

export const categoryStatusValues = Object.values(categoryStatus);

export type TCategorySearchableField =
  (typeof categorySearchableFields)[number];
export type TCategorySortableField = (typeof categorySortableFields)[number];
export type TCategoryStatusType =
  (typeof categoryStatus)[keyof typeof categoryStatus];

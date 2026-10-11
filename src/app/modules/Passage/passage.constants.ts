export const passageSearchableFields = [
  "titleEn",
  "titleBn",
  "bodyEn",
  "bodyBn",
] as const;
export const passageSortableFields = [
  "publishedAt",
  "archivedAt",
  "status",
  "titleEn",
  "createdAt",
  "updatedAt",
] as const;

export const PASSAGE_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export const PASSAGE_STATUS_VALUES = Object.values(PASSAGE_STATUS);

export const PASSAGE_PROJECTION_TYPE = ["list", "details", "options"] as const;

export const PASSAGE_PROJECTION_FIELDS = {
  options: {
    _id: 0,
    passageId: "$_id",
    titleEn: "$titleEn",
    titleBn: "$titleBn",
    slug: "$slug",
    status: "$status",
    publishedAt: {
      $ifNull: ["$publishedAt", null],
    },
    archivedAt: {
      $ifNull: ["$archivedAt", null],
    },
  },
  list: {
    _id: 0,
    passageId: "$_id",
    titleEn: "$titleEn",
    titleBn: "$titleBn",
    slug: "$slug",
    bodyBn: "$bodyBn",
    status: "$status",
    mediaUrl: { $ifNull: ["$mediaUrl", null] },

    author: "$author",
    publishedAt: {
      $ifNull: ["$publishedAt", null],
    },
    archivedAt: {
      $ifNull: ["$archivedAt", null],
    },
    createdAt: "$createdAt",
    updatedAt: "$updatedAt",
  },
  details: {
    _id: 0,
    passageId: "$_id",
    titleEn: "$titleEn",
    titleBn: "$titleBn",
    slug: "$slug",
    bodyBn: "$bodyBn",
    status: "$status",
    mediaUrl: { $ifNull: ["$mediaUrl", null] },
    metaTitle: { $ifNull: ["$metaTitle", null] },
    metaDescription: { $ifNull: ["$metaTitle", null] },
    ogImage: {
      $ifNull: ["$ogImage", null],
    },
    author: "$author",
    publishedAt: {
      $ifNull: ["$publishedAt", null],
    },
    archivedAt: {
      $ifNull: ["$archivedAt", null],
    },
    createdAt: "$createdAt",
    updatedAt: "$updatedAt",
  },
};

export type TPassageSearchableField = (typeof passageSearchableFields)[number];
export type TPassageSortableField = (typeof passageSortableFields)[number];
export type TPassageStatusType =
  (typeof PASSAGE_STATUS)[keyof typeof PASSAGE_STATUS];

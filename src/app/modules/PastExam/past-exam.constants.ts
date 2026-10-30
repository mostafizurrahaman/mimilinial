export const EXAM_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export const EXAM_STATUS_VALUES = Object.values(EXAM_STATUS);

export const pastExamSearchableFields = [
  "nameBn",
  "nameEn",
  "year",
  "description",
  "categoryNameEn",
  "categoryNameBn",
  "trackNameEn",
  "trackNameBn",
] as const;

export const pastExamSortableFields = [
  "nameBn",
  "nameEn",
  "year",
  "totalQuestions",
  "status",
  "categoryStatus",
  "trackStatus",
  "publishedAt",
  "archivedAt",
  "createdAt",
  "updatedAt",
] as const;

export const pastExamProjectTypes = ["list", "options", "details"] as const;

export const pastExamProjection = {
  options: {
    _id: 0,
    pastExamId: "$_id",
    nameBn: "$nameBn",
    nameEn: "$nameEn",
    slug: "$slug",
    year: "$year",
    totalQuestions: "$totalQuestions",
    status: "$status",
    categoryStatus: "$categoryDetails.status",
    trackStatus: "$trackDetails.status",
  },

  list: {
    _id: 0,
    pastExamId: "$_id",
    categoryId: "$categoryDetails._id",
    categoryNameEn: "$categoryDetails.nameEn",
    categoryNameBn: "$categoryDetails.nameBn",
    categoryStatus: "$categoryDetails.status",

    trackId: { $ifNull: ["$trackDetails._id", null] },
    trackNameEn: { $ifNull: ["$trackDetails.nameEn", null] },
    trackNameBn: { $ifNull: ["$trackDetails.nameBn", null] },
    trackStatus: { $ifNull: ["$trackDetails.status", null] },

    nameBn: "$nameBn",
    nameEn: "$nameEn",
    slug: "$slug",
    year: "$year",
    totalQuestions: "$totalQuestions",
    status: "$status",

    publishedAt: { $ifNull: ["$publishedAt", null] },
    archivedAt: { $ifNull: ["$archivedAt", null] },

    createdAt: "$createdAt",
    updatedAt: "$updatedAt",
  },

  details: {
    _id: 0,
    pastExamId: "$_id",
    categoryId: "$categoryDetails._id",
    categoryNameEn: "$categoryDetails.nameEn",
    categoryNameBn: "$categoryDetails.nameBn",
    categoryStatus: "$categoryDetails.status",

    trackId: { $ifNull: ["$trackDetails._id", null] },
    trackNameEn: { $ifNull: ["$trackDetails.nameEn", null] },
    trackNameBn: { $ifNull: ["$trackDetails.nameBn", null] },
    trackStatus: { $ifNull: ["$trackDetails.status", null] },

    nameBn: "$nameBn",
    nameEn: "$nameEn",
    slug: "$slug",
    year: "$year",
    description: { $ifNull: ["$description", null] },
    totalQuestions: "$totalQuestions",
    status: "$status",
    author: "$author",

    publishedAt: { $ifNull: ["$publishedAt", null] },
    archivedAt: { $ifNull: ["$archivedAt", null] },

    createdAt: "$createdAt",
    updatedAt: "$updatedAt",
  },
} as const;

export type TPastExamSearchableField =
  (typeof pastExamSearchableFields)[number];
export type TPastExamSortableField = (typeof pastExamSortableFields)[number];
export type TExamStatusType = (typeof EXAM_STATUS)[keyof typeof EXAM_STATUS];
export type TPastExamProjectType = (typeof pastExamProjectTypes)[number];

export const SUBJECT_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export const SUBJECT_STATUS_VALUES = Object.values(SUBJECT_STATUS);

export const subjectSearchableFields = [
  "nameEn",
  "nameBn",
  "description",
  "code",
  "slug",
] as const;

export const subjectSortableFields = [
  "createdAt",
  "updatedAt",
  "sortOrder",
  "nameEn",
  "nameBn",
  "description",
  "status",
  "publishedAt",
  "archivedAt",
] as const;

export const subjectProjectTypes = ["list", "details"] as const;

export type TSubjectSearchableField = (typeof subjectSearchableFields)[number];
export type TSubjectSortableField = (typeof subjectSortableFields)[number];
export type TSubjectStatus =
  (typeof SUBJECT_STATUS)[keyof typeof SUBJECT_STATUS];

export const subjectProjections = {
  list: {
    _id: 0,
    subjectId: "$_id",
    nameBn: "$nameBn",
    nameEn: "$nameEn",
    slug: "$slug",
    code: "$code",
    colorCode: "$colorCode",
    isFeatured: "$isFeatured",
    status: "$status",
  },
  details: {
    _id: 0,
    subjectId: "$_id",
    nameBn: "$nameBn",
    nameEn: "$nameEn",
    slug: "$slug",
    code: "$code",
    description: "$description",
    colorCode: "$colorCode",
    icon: { $ifNull: ["$icon", null] },
    sortOrder: "$sortOrder",
    isFeatured: "$isFeatured",
    status: "$status",
    metaTitle: { $ifNull: ["$metaTitle", null] },
    metaDescription: { $ifNull: ["$metaDescription", null] },
    ogImage: { $ifNull: ["$ogImage", null] },
    author: "$author",
    publishedAt: "$publishedAt",
    archivedAt: "$archivedAt",
    createdAt: "$createdAt",
    updatedAt: "$updatedAt",
  },
};

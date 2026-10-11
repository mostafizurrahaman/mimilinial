export const collectionSearchableFields = [
   "nameBn",
   "nameEn",
   "slug",
   "description",
   // "authorEmail",
] as const;
export const collectionSortableFields = [
   "createdAt",
   "updatedAt",
   "nameBn",
   "nameEn",
   "status",
   "publishedAt",
   "archivedAt",
] as const;

export const COLLECTION_STATUS = {
   DRAFT: "draft",
   PUBLISHED: "published",
   ARCHIVED: "archived",
} as const;

export const collectionProjectTypes = ["list", "options", "details"] as const;

export const collectionProjection = {
   options: {
      collectionId: "$_id",
      nameBn: "$nameBn",
      nameEn: "$nameEn",
      slug: "$slug",
      status: "$status",
      icon: { $ifNull: ["$icon", null] },
      publishedAt: "$publishedAt",
   },
   details: {
      collectionId: "$_id",
      nameBn: "$nameBn",
      nameEn: "$nameEn",
      slug: "$slug",
      status: "$status",
      author: "$author",
      description: { $ifNull: ["$description", null] },
      icon: { $ifNull: ["$icon", null] },
      metaTitle: { $ifNull: ["$metaTitle", null] },
      metaDescription: { $ifNull: ["$metaDescription", null] },
      ogImage: { $ifNull: ["$ogImage", null] },
      publishedAt: "$publishedAt",
      archivedAt: "$archivedAt",
      createdAt: "$createdAt",
      updatedAt: "$updatedAt",
   },
   list: {
      collectionId: "$_id",
      nameBn: "$nameBn",
      nameEn: "$nameEn",
      slug: "$slug",
      status: "$status",
      author: "$author",
      description: { $ifNull: ["$description", null] },
      icon: { $ifNull: ["$icon", null] },
      publishedAt: "$publishedAt",
      archivedAt: "$archivedAt",
      createdAt: "$createdAt",
      updatedAt: "$updatedAt",
   },
} as const;

export const COLLECTION_STATUS_VALUES = Object.values(COLLECTION_STATUS);

export type TCollectionSearchableField =
   (typeof collectionSearchableFields)[number];
export type TCollectionSortableField =
   (typeof collectionSortableFields)[number];
export type TCollectionStatus =
   (typeof COLLECTION_STATUS)[keyof typeof COLLECTION_STATUS];

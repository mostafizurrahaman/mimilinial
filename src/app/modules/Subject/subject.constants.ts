export const subjectSearchableFields = [
   "name_en",
   "name_bn",
   "description",
   "code",
   "slug",
] as const;
export const subjectSortableFields = [
   "createdAt",
   "updatedAt",
   "sortOrder",
   "name_en",
   "name_bn",
   "description",
] as const;

export const subjectProjectTypes = ["list", "details"] as const;

export type TSubjectSearchableField = (typeof subjectSearchableFields)[number];
export type TSubjectSortableField = (typeof subjectSortableFields)[number];

export const subjectProjections = {
   list: {
      _id: 0,
      subjectId: "$_id",
      name_bn: "$name_bn",
      name_en: "$name_en",
      slug: "$slug",
      code: "$code",
      colorCode: "$colorCode",
      isFeatured: "$isFeatured",
      isActive: "$isActive",
   },
   details: {
      _id: 0,
      subjectId: "$_id",
      name_bn: "$name_bn",
      name_en: "$name_en",
      slug: "$slug",
      code: "$code",
      description: "$description",
      colorCode: "$colorCode",
      icon: { $ifNull: ["$icon", null] },
      sortOrder: "$sortOrder",
      isFeatured: "$isFeatured",
      isActive: "$isActive",
      metaTitle: { $ifNull: ["$metaTitle", null] },
      metaDescription: { $ifNull: ["$metaDescription", null] },
      ogImage: { $ifNull: ["$ogImage", null] },
      author: "$author",
      createdAt: "$createdAt",
      updatedAt: "$updatedAt",
   },
};

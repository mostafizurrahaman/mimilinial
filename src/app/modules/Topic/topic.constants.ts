export const topicSearchableFields = [
  "nameEn",
  "nameBn",
  "description",
  "subjectNameEn",
  "subjectNameBn",
  "parentTopicNameEn",
  "parentTopicNameBn",
  "slug",
  "subjectSlug",
  "status",
] as const;

export const TOPIC_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export const TOPIC_PROJECTION_VALUES = ["list", "options", "details"] as const;

export const TOPIC_PROJECTION_FIELDS = {
  // =========================
  // LIST
  // =========================
  list: {
    _id: 0,

    topicId: "$_id",
    subjectId: "$subject",
    parentTopic: { $ifNull: ["$parentTopic", null] },

    nameBn: "$nameBn",
    nameEn: "$nameEn",
    slug: "$slug",

    sortOrder: "$sortOrder",
    depth: "$depth",
    status: "$status",

    subjectNameEn: "$subjectDetails.nameEn",
    subjectNameBn: "$subjectDetails.nameBn",
    subjectStatus: "$subjectDetails.status",

    parentTopicNameBn: "$parentTopicDetails.nameBn",
    parentTopicNameEn: "$parentTopicDetails.nameEn",
    parentTopicStatus: "$parentTopicDetails.status",

    "childTopics.draft": { $ifNull: ["$childTopics.draft", 0] },
    "childTopics.published": { $ifNull: ["$childTopics.published", 0] },
    "childTopics.archived": { $ifNull: ["$childTopics.archived", 0] },
    "childTopics.total": { $ifNull: ["$childTopics.total", 0] },

    createdAt: "$createdAt",
    updatedAt: "$updatedAt",
  },

  // =========================
  // DETAILS
  // =========================
  details: {
    _id: 0,

    topicId: "$_id",
    subjectId: "$subject",
    author: "$author",

    parentTopic: { $ifNull: ["$parentTopic", null] },

    nameBn: "$nameBn",
    nameEn: "$nameEn",
    slug: "$slug",

    iconUrl: { $ifNull: ["$iconUrl", null] },

    descriptionBn: { $ifNull: ["$descriptionBn", null] },
    descriptionEn: { $ifNull: ["$descriptionEn", null] },

    sortOrder: "$sortOrder",
    depth: "$depth",
    status: "$status",

    metaTitle: { $ifNull: ["$metaTitle", null] },
    metaDescription: { $ifNull: ["$metaDescription", null] },
    ogImage: { $ifNull: ["$ogImage", null] },

    publishedAt: { $ifNull: ["$publishedAt", null] },
    archivedAt: { $ifNull: ["$archivedAt", null] },

    createdAt: "$createdAt",
    updatedAt: "$updatedAt",

    subjectNameEn: "$subjectDetails.nameEn",
    subjectNameBn: "$subjectDetails.nameBn",
    subjectStatus: "$subjectDetails.status",

    parentTopicNameBn: "$parentTopicDetails.nameBn",
    parentTopicNameEn: "$parentTopicDetails.nameEn",
    parentTopicStatus: "$parentTopicDetails.status",

    "childTopics.draft": { $ifNull: ["$childTopics.draft", 0] },
    "childTopics.published": { $ifNull: ["$childTopics.published", 0] },
    "childTopics.archived": { $ifNull: ["$childTopics.archived", 0] },
    "childTopics.total": { $ifNull: ["$childTopics.total", 0] },
  },

  // =========================
  // OPTIONS
  // =========================
  options: {
    _id: 0,

    topicId: "$_id",
    nameBn: "$nameBn",
    nameEn: "$nameEn",
    slug: "$slug",
    status: "$status",
  },
};

export const TOPIC_STATUS_VALUES = Object.values(TOPIC_STATUS);

export const topicSortableFields = [
  "createdAt",
  "updatedAt",
  "nameEn",
  "nameBn",
  "status",
  "sortOrder",
  "depth",
  "subjectNameBn",
  "subjectNameEn",
  "publishedAt",
  "archivedAt",
] as const;

export type TTopicSearchableField = (typeof topicSearchableFields)[number];
export type TTopicSortableField = (typeof topicSortableFields)[number];
export type TTopicStatus = (typeof TOPIC_STATUS)[keyof typeof TOPIC_STATUS];

export const questionsSearchableFields = [
  "slug",
  "planStem",
  "code",
  "explanation",
] as const;
export const questionsSortableFields = [
  "createdAt",
  "updatedAt",
  "type",
  "difficulty",
  "language",
] as const;

export const QUESTION_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export const QUESTION_DIFFICULTY = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
} as const;

export const QUESTION_TYPE = {
  SINGLE_MCQ: "single_mcq",
  MULTI_MCQ: "multi_mcq",
  TRUE_FALSE: "true_false",
  FILL_BLANK: "fill_blank",
  MATCHING: "matching",
  ORDERING: "ordering",
} as const;

export const questionVersionSearchableFields = ["name"] as const;
export const questionVersionSortableFields = [
  "createdAt",
  "updatedAt",
] as const;

export const QUESTION_CODE_REGEX = /^Q-\d{6}$/;

export const QUESTION_VERSION_LANGUAGE = {
  BANGLA: "bn",
  ENGLISH: "en",
} as const;
export const QuestionVersionLanguageValues = Object.values(
  QUESTION_VERSION_LANGUAGE,
);

export const questionProjectionValues = ["list", "details", "options"] as const;

// Projection

export const questionProjections = {
  details: {
    _id: 0,
    questionId: "$_id",
    code: "$code",
    slug: "$slug",
    type: "$type",
    difficulty: "$difficulty",
    status: "$status",
    isFlagged: "$isFlagged",

    // Passage Details:
    passageId: { $ifNull: ["$passageId", null] },
    passageTitleEn: { $ifNull: ["$passageDetails.titleEn", null] },
    passageTitleBn: { $ifNull: ["$passageDetails.titleBn", null] },
    passageSlug: { $ifNull: ["$passageDetails.passageSlug", null] },
    bodyEn: { $ifNull: ["$passageDetails.bodyEn", null] },
    bodyBn: { $ifNull: ["$passageDetails.bodyBn", null] },
    passageMediaUrl: { $ifNull: ["$passageDetails.mediaUrl", null] },

    // Current Version:
    versionNumber: { $ifNull: ["$currentVersion.versionNumber", 0] },
    stem: { $ifNull: ["$currentVersion.stem", null] },
    explanation: { $ifNull: ["$currentVersion.explanation", null] },
    isCurrent: { $ifNull: ["$currentVersion.isCurrent", null] },
    language: { $ifNull: ["$currentVersion.language", null] },
    mediaUrl: { $ifNull: ["$currentVersion.mediaUrl", null] },
    changeLog: { $ifNull: ["$currentVersion.changeLog", null] },

    // Author Details:
    authorId: "$author",
    authorName: { $ifNull: ["$authorDetails.name", null] },
    authorEmail: { $ifNull: ["$authorDetails.email", null] },

    orderingItems: {
      $cond: [
        { $eq: ["$type", "ordering"] },
        "$currentVersion.orderingItems",
        "$$REMOVE",
      ],
    },
    pairs: {
      $cond: [
        { $eq: ["$type", "matching"] },
        "$currentVersion.pairs",
        "$$REMOVE",
      ],
    },
    acceptedAnswers: {
      $cond: [
        { $eq: ["$type", "fill_blank"] },
        "$currentVersion.acceptedAnswers",
        "$$REMOVE",
      ],
    },
    options: {
      $cond: [
        { $in: ["$type", ["true_false", "single_mcq", "multi_mcq"]] },
        "$currentVersion.options",
        "$$REMOVE",
      ],
    },

    createdAt: "$createdAt",
    updatedAt: "$updatedAt",
  },
  list: {
    _id: 0,
    questionId: "$_id",
    code: "$code",
    slug: "$slug",
    type: "$type",
    difficulty: "$difficulty",
    status: "$status",
    // Passage Details:
    passageId: { $ifNull: ["$passageId", null] },
    passageTitleEn: { $ifNull: ["$passageDetails.titleEn", null] },
    passageTitleBn: { $ifNull: ["$passageDetails.titleBn", null] },
    stem: { $ifNull: ["$currentVersion.stem", null] },
    language: { $ifNull: ["$currentVersion.language", null] },

    orderingItems: {
      $cond: [
        { $eq: ["$type", "ordering"] },
        "$currentVersion.orderingItems",
        "$$REMOVE",
      ],
    },
    pairs: {
      $cond: [
        { $eq: ["$type", "matching"] },
        "$currentVersion.pairs",
        "$$REMOVE",
      ],
    },
    acceptedAnswers: {
      $cond: [
        { $eq: ["$type", "fill_blank"] },
        "$currentVersion.acceptedAnswers",
        "$$REMOVE",
      ],
    },
    options: {
      $cond: [
        { $in: ["$type", ["true_false", "single_mcq", "multi_mcq"]] },
        "$currentVersion.options",
        "$$REMOVE",
      ],
    },
  },
  options: {
    _id: 0,
    questionId: "$_id",
    code: "$code",
    slug: "$slug",
    stem: "$plainStem",
    difficulty: "$difficulty",
    status: "$status",
  },
};

export type TQuestionVersionSearchableField =
  (typeof questionVersionSearchableFields)[number];
export type TQuestionVersionSortableField =
  (typeof questionVersionSortableFields)[number];
export type TQuestionVersionLanguageType =
  (typeof QUESTION_VERSION_LANGUAGE)[keyof typeof QUESTION_VERSION_LANGUAGE];

export const QUESTION_STATUS_VALUES = Object.values(QUESTION_STATUS);

export const QUESTION_DIFFICULTY_VALUES = Object.values(QUESTION_DIFFICULTY);

export const QUESTION_TYPE_VALUES = Object.values(QUESTION_TYPE);

export type TQuestionsSearchableField =
  (typeof questionsSearchableFields)[number];
export type TQuestionsSortableField = (typeof questionsSortableFields)[number];

export type TQuestionStatusType =
  (typeof QUESTION_STATUS)[keyof typeof QUESTION_STATUS];
export type TQuestionDifficultyType =
  (typeof QUESTION_DIFFICULTY)[keyof typeof QUESTION_DIFFICULTY];
export type TQuestionType = (typeof QUESTION_TYPE)[keyof typeof QUESTION_TYPE];

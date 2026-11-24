export const MASTERY_LEVEL = {
  WEAK: "weak",         // Accuracy < 60%
  AVERAGE: "average",   // 60% <= Accuracy < 75%
  STRONG: "strong",     // 75% <= Accuracy < 90%
  MASTERED: "mastered", // Accuracy >= 90%
} as const;

export const masteryLevelValues = Object.values(MASTERY_LEVEL);
export type TMasteryLevel = (typeof MASTERY_LEVEL)[keyof typeof MASTERY_LEVEL];

export const userMasterySortableFields = [
  "accuracyPercentage",
  "totalQuestionsAttempted",
  "totalCorrect",
  "lastAttemptedAt",
  "createdAt",
  "updatedAt",
] as const;

export type TUserMasterySortableField =
  (typeof userMasterySortableFields)[number];

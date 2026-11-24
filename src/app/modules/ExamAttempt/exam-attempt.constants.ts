export const examAttemptSearchableFields = ["ipAddress", "userAgent"] as const;

export const examAttemptSortableFields = [
  "createdAt",
  "updatedAt",
  "startDate",
  "expiresAt",
  "submittedAt",
  "totalTimeTakenSeconds",
] as const;

export const ExamAttemptStatus = {
  IN_PROGRESS: "in_progress",
  SUBMITTED: "submitted",
  TIME_OUT: "time_out",
  CANCELLED: "cancelled",
} as const;

export const examAttemptStatusValues = Object.values(ExamAttemptStatus);
export type TExamAttemptStatus =
  (typeof ExamAttemptStatus)[keyof typeof ExamAttemptStatus];

export type TExamAttemptSearchableField =
  (typeof examAttemptSearchableFields)[number];
export type TExamAttemptSortableField =
  (typeof examAttemptSortableFields)[number];

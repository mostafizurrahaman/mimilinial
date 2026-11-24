import z from "zod";
import {
  requiredString,
  optionalString,
  optionalNumber,
  optionalEnumString,
  optionalDate,
  requiredMongooseId,
  requiredStrBoolean,
} from "../../utils";
import { examResultSortableFields } from "./exam-result.constants";
import { sortOrderValues } from "../../constants";

// 1. GET MY RESULTS SCHEMA
const getMyResultsSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
    sortBy: optionalEnumString(examResultSortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date"),

    // Filters
    isPassed: requiredStrBoolean("Is passed").optional(),
    isSelfPractice: requiredStrBoolean("Is self practice").optional(),
    examId: optionalString("Exam ID"),
  }),
});

// 2. GET ALL RESULTS SCHEMA (Admin)
const getAllExamResultsSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
    sortBy: optionalEnumString(examResultSortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date"),

    // Filters
    isPassed: requiredStrBoolean("Is passed").optional(),
    isSelfPractice: requiredStrBoolean("Is self practice").optional(),
    examId: optionalString("Exam ID"),
    userId: optionalString("User ID"),
  }),
});

// 3. GET RESULT BY ID SCHEMA
const getExamResultByIdSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Result ID"),
  }),
});

// 4. GET RESULT BY ATTEMPT ID SCHEMA
const getExamResultByAttemptIdSchema = z.object({
  params: z.object({
    attemptId: requiredMongooseId("Attempt ID"),
  }),
});

// 5. GET EXAM LEADERBOARD SCHEMA
const getExamLeaderboardSchema = z.object({
  params: z.object({
    examId: requiredMongooseId("Exam ID"),
  }),
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
  }),
});

// 6. GET GLOBAL LEADERBOARD SCHEMA
const getGlobalLeaderboardSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    period: optionalEnumString(
      ["all_time", "monthly", "weekly"] as const,
      "Period",
    ),
    collectionId: optionalString("Collection ID"),
  }),
});

export const examResultValidations = {
  getMyResultsSchema,
  getAllExamResultsSchema,
  getExamResultByIdSchema,
  getExamResultByAttemptIdSchema,
  getExamLeaderboardSchema,
  getGlobalLeaderboardSchema,
};

export type TGetMyResultsQueryParamsType = z.infer<
  typeof getMyResultsSchema.shape.query
>;
export type TGetAllExamResultsQueryParamsType = z.infer<
  typeof getAllExamResultsSchema.shape.query
>;
export type TGetExamResultByIdParamsType = z.infer<
  typeof getExamResultByIdSchema.shape.params
>;
export type TGetExamResultByAttemptIdParamsType = z.infer<
  typeof getExamResultByAttemptIdSchema.shape.params
>;
export type TGetExamLeaderboardParamsType = z.infer<
  typeof getExamLeaderboardSchema.shape.params
>;
export type TGetExamLeaderboardQueryParamsType = z.infer<
  typeof getExamLeaderboardSchema.shape.query
>;
export type TGetGlobalLeaderboardQueryParamsType = z.infer<
  typeof getGlobalLeaderboardSchema.shape.query
>;

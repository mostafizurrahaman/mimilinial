import z from "zod";
import mongoose from "mongoose";
import {
  requiredString,
  optionalString,
  requiredNumber,
  optionalNumber,
  enumString,
  optionalEnumString,
  optionalDate,
  requiredMongooseId,
  requiredStrBoolean,
  multipleMongooseId,
} from "../../utils";
import {
  examAttemptSortableFields,
  examAttemptStatusValues,
} from "./exam-attempt.constants";
import { sortOrderValues } from "../../constants";

export const QUESTION_TYPES_LIST = [
  "single_mcq",
  "multi_mcq",
  "multiple_mcq",
  "true_false",
  "fill_blank",
  "matching",
  "ordering",
] as const;

// 1. START OFFICIAL EXAM SCHEMA
const startOfficialExamSchema = z.object({
  params: z.object({
    examId: requiredMongooseId("Exam ID"),
  }),
});

// 2. START SELF PRACTICE EXAM SCHEMA
const startSelfPracticeExamSchema = z.object({
  body: z
    .object({
      category: requiredMongooseId("Category ID").optional(),
      subject: requiredMongooseId("Subject ID").optional(),
      topics: multipleMongooseId("Category IDs").optional().default([]),
      totalQuestions: requiredNumber("Total questions")
        .min(1, "At least 1 question is required")
        .max(100, "Maximum 200 questions allowed"),
      durationMins: requiredNumber("Duration minutes")
        .min(1, "Duration must be at least 1 minute")
        .max(180, "Duration cannot exceed 180 minutes"),
    })
    .superRefine((data, ctx) => {
      // Must provide at least category or subject
      if (!data.category && !data.subject) {
        ctx.addIssue({
          code: "custom",
          message:
            "Either Category ID or Subject ID must be provided for self-practice.",
          path: ["category"],
        });
      }
    }),
});

// 3. SYNC ANSWER SCHEMA
const syncAnswerSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Attempt ID"),
  }),
  body: z
    .object({
      mappingId: requiredMongooseId("Question Mapping ID"),
      questionType: enumString(QUESTION_TYPES_LIST, "Question type"),
      userAnswer: z.any().optional(),
      isMarkedForReview: z.boolean().optional().default(false),
      timeSpentSeconds: optionalNumber("Time spent seconds").default(0),
    })
    .superRefine((data, ctx) => {
      if (data.userAnswer === null || data.userAnswer === undefined) {
        return; // user cleared answer
      }

      switch (data.questionType) {
        case "single_mcq":
        case "true_false": {
          if (
            typeof data.userAnswer !== "string" ||
            !mongoose.isValidObjectId(data.userAnswer)
          ) {
            ctx.addIssue({
              code: "custom",
              path: ["userAnswer"],
              message:
                "User answer for single_mcq/true_false must be a valid Option ObjectId.",
            });
          }
          break;
        }

        case "multi_mcq":
        case "multiple_mcq": {
          if (!Array.isArray(data.userAnswer)) {
            ctx.addIssue({
              code: "custom",
              path: ["userAnswer"],
              message:
                "User answer for multi_mcq must be an array of Option ObjectIds.",
            });
          } else {
            const hasInvalid = data.userAnswer.some(
              (id) => typeof id !== "string" || !mongoose.isValidObjectId(id),
            );
            if (hasInvalid) {
              ctx.addIssue({
                code: "custom",
                path: ["userAnswer"],
                message: "One or more Option IDs in multi_mcq are invalid.",
              });
            }
          }
          break;
        }

        case "fill_blank": {
          if (typeof data.userAnswer !== "string") {
            ctx.addIssue({
              code: "custom",
              path: ["userAnswer"],
              message: "User answer for fill_blank must be a string.",
            });
          }
          break;
        }

        case "matching": {
          if (!Array.isArray(data.userAnswer)) {
            ctx.addIssue({
              code: "custom",
              path: ["userAnswer"],
              message:
                "User answer for matching must be an array of { left, right } pairs.",
            });
          } else {
            const hasInvalidPair = data.userAnswer.some(
              (p) =>
                !p ||
                typeof p !== "object" ||
                typeof p.left !== "string" ||
                typeof p.right !== "string",
            );
            if (hasInvalidPair) {
              ctx.addIssue({
                code: "custom",
                path: ["userAnswer"],
                message:
                  "Each matching item must be an object with string 'left' and 'right' properties.",
              });
            }
          }
          break;
        }

        case "ordering": {
          if (
            !Array.isArray(data.userAnswer) ||
            data.userAnswer.some((item) => typeof item !== "string")
          ) {
            ctx.addIssue({
              code: "custom",
              path: ["userAnswer"],
              message:
                "User answer for ordering must be an array of strings in order.",
            });
          }
          break;
        }
      }
    }),
});

// 4. LOG TAB SWITCH SCHEMA
const logTabSwitchSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Attempt ID"),
  }),
});

// 5. SUBMIT EXAM SCHEMA
const submitExamSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Attempt ID"),
  }),
});

// 6. GET ATTEMPT BY ID / RESUME / REVIEW SCHEMA
const getAttemptByIdSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Attempt ID"),
  }),
});

// 7. GET ALL ATTEMPTS SCHEMA
const getAllExamAttemptSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
    sortBy: optionalEnumString(examAttemptSortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date"),

    // Filters
    status: optionalEnumString(examAttemptStatusValues, "Status"),
    examId: optionalString("Exam ID"),
    userId: optionalString("User ID"),
    isSelfPractice: requiredStrBoolean("Is self practice").optional(),
  }),
});

// 8. CANCEL ATTEMPT SCHEMA (Admin)
const cancelAttemptSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Attempt ID"),
  }),
  body: z.object({
    reason: requiredString("Cancellation reason"),
  }),
});

export const examAttemptValidations = {
  startOfficialExamSchema,
  startSelfPracticeExamSchema,
  syncAnswerSchema,
  logTabSwitchSchema,
  submitExamSchema,
  getAttemptByIdSchema,
  getAllExamAttemptSchema,
  cancelAttemptSchema,
};

export type TStartOfficialExamParamsType = z.infer<
  typeof startOfficialExamSchema.shape.params
>;
export type TStartSelfPracticeExamPayloadType = z.infer<
  typeof startSelfPracticeExamSchema.shape.body
>;
export type TSyncAnswerParamsType = z.infer<
  typeof syncAnswerSchema.shape.params
>;
export type TSyncAnswerPayloadType = z.infer<
  typeof syncAnswerSchema.shape.body
>;
export type TLogTabSwitchParamsType = z.infer<
  typeof logTabSwitchSchema.shape.params
>;
export type TSubmitExamParamsType = z.infer<
  typeof submitExamSchema.shape.params
>;
export type TGetAttemptByIdParamsType = z.infer<
  typeof getAttemptByIdSchema.shape.params
>;
export type TGetAllExamAttemptQueryParamsType = z.infer<
  typeof getAllExamAttemptSchema.shape.query
>;
export type TCancelAttemptParamsType = z.infer<
  typeof cancelAttemptSchema.shape.params
>;
export type TCancelAttemptPayloadType = z.infer<
  typeof cancelAttemptSchema.shape.body
>;

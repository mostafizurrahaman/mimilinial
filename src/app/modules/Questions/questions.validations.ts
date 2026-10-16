import {
  enumString,
  optionalString,
  positiveNumber,
  requiredMongooseId,
  requiredStrBoolean,
  requiredString,
} from "@/app/utils";
import z from "zod";
import { QUESTION_CODE_REGEX } from "../QuestionVersion";
import { QUESTION_DIFFICULTY_VALUES } from "./questions.constants";
import { sanitizeHtmlContent } from "./sanitize-html";

// Base Schema  common fields:
const baseQuestionSchema = z.object({
  difficulty: enumString(QUESTION_DIFFICULTY_VALUES, "Difficulty"),
  passageId: requiredMongooseId("Passage ID").optional().nullable(),
});

// Base Question Version Schema:
const baseQuestionVersionSchema = z.object({
  stem: requiredString("Stem")
    .trim()
    .min(1, "Question stem is required")
    .max(2500, "Question stem cannot exceed 2500 characters")
    .transform((val) => sanitizeHtmlContent(val)),
  explanation: z
    .string()
    .trim()
    .max(10_000, "Explanation cannot exceed 10,000 characters")
    .optional()
    .transform((val) => sanitizeHtmlContent(val as string)),
  mediaUrl: optionalString("Media url").nullable(),
  changeLog: requiredString("Change log").max(500, "Change log"),
});

/**
 *     ==========================
 *       Single  MCQ Question
 * ====================
 */

// 1.1. SINGLE MCQ OPTION Schema:
const singleMcqOptionSchema = z.object({
  sortOrder: positiveNumber("Sort order"),
  content: requiredString("Content").transform((val) =>
    sanitizeHtmlContent(val),
  ),
  mediaUrl: optionalString("Media url").nullable(),
  isCorrect: requiredStrBoolean("Is correct"),
});

// 1.2 SINGLE QUESTION Schema:
const createSingelMcqQuestionSchema = z.object({
  body: z
    .object({
      ...baseQuestionSchema.shape,
      ...baseQuestionVersionSchema.shape,
      options: z
        .array(singleMcqOptionSchema, {
          error: "Options should be a list",
        })
        .min(2, "At least 2 options are required")
        .max(10, "A maximum of 10 options are allowed"),
    })
    .superRefine((data, ctx) => {
      if (data?.options && data?.options?.length > 0) {
        const correctItems = data?.options?.filter((opt) => opt.isCorrect);

        if (correctItems.length !== 1) {
          ctx.addIssue({
            code: "custom",
            message: "Exactly one correct option is required.",
            path: ["optoins"],
          });
        }
      }
    }),
});

//  Export all :
export const questionValidations = {
  createSingelMcqQuestionSchema,
};

export type TCreateSingleMcqQuestionPayloadType = z.infer<
  typeof createSingelMcqQuestionSchema.shape.body
>;

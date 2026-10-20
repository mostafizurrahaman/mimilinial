import {
  enumString,
  optionalString,
  positiveNumber,
  requiredMongooseId,
  requiredStrBoolean,
  requiredString,
} from "@/app/utils";
import z from "zod";
import { QUESTION_DIFFICULTY_VALUES } from "./questions.constants";
import { sanitizeHtmlContent } from "./sanitize-html";
import { questionUtils } from "./question-utils";
import type {
  IMatchingPair,
  IOrderingItem,
  IQuestionOption,
} from "./questions.interfaces";

// Base Schema common fields:
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
 * ========================================================
 * 1. SINGLE MCQ QUESTION SCHEMA
 * ========================================================
 */

// 1.1. MCQ Option Schema:
const OptionsSchema = z.object({
  sortOrder: positiveNumber("Sort order"),
  content: requiredString("Content").transform((val) =>
    sanitizeHtmlContent(val),
  ),
  mediaUrl: optionalString("Media url").nullable(),
  isCorrect: requiredStrBoolean("Is correct"),
});

// 1.2 SINGLE MCQ Question Schema:
const createSingleMcqQuestionSchema = z.object({
  body: z
    .object({
      ...baseQuestionSchema.shape,
      ...baseQuestionVersionSchema.shape,
      options: z
        .array(OptionsSchema, {
          error: "Options should be a list",
        })
        .min(2, "At least 2 options are required")
        .max(10, "A maximum of 10 options are allowed"),
    })
    .superRefine((data, ctx) => {
      if (data?.options && data?.options?.length > 0) {
        const hasDuplicateOption = questionUtils.hasDuplicateOptions(
          data?.options as IQuestionOption[],
        );

        if (hasDuplicateOption) {
          ctx.addIssue({
            code: "custom",
            message: "Duplicate options are not allowed.",
            path: ["options"],
          });
        }

        const correctItems = data?.options?.filter((opt) => opt.isCorrect);

        if (correctItems.length !== 1) {
          ctx.addIssue({
            code: "custom",
            message: "Exactly one correct option is required.",
            path: ["options"],
          });
        }
      }
    }),
});

/**
 * ========================================================
 * 2. MULTI MCQ QUESTION SCHEMA
 * ========================================================
 */

const createMultiMcqOptionSchema = z.object({
  body: z
    .object({
      ...baseQuestionSchema.shape,
      ...baseQuestionVersionSchema.shape,
      options: z
        .array(OptionsSchema, {
          error: "Options should be a list",
        })
        .min(2, "At least 2 options are required")
        .max(10, "A maximum of 10 options are allowed"),
    })
    .superRefine((data, ctx) => {
      if (data?.options && data?.options?.length > 0) {
        const hasDuplicateOption = questionUtils.hasDuplicateOptions(
          data?.options as IQuestionOption[],
        );

        if (hasDuplicateOption) {
          ctx.addIssue({
            code: "custom",
            message: "Duplicate options are not allowed.",
            path: ["options"],
          });
        }

        const correctItems = data?.options?.filter((opt) => opt.isCorrect);

        if (correctItems.length < 1) {
          ctx.addIssue({
            code: "custom",
            message: "At least one correct option is required.",
            path: ["options"],
          });
        }
      }
    }),
});

/**
 * ========================================================
 * 3. TRUE / FALSE QUESTION SCHEMA
 * ========================================================
 */

const TrueFalseOptionSchema = z.object({
  sortOrder: positiveNumber("Sort order"),
  content: z
    .string({ error: "Option content is required" })
    .trim()
    .refine((val) => ["true", "false"].includes(val.toLowerCase()), {
      message: "Option content must be either 'true' or 'false'",
    })
    .transform((val) => val.toLowerCase()),
  mediaUrl: optionalString("Media url").nullable().optional(),
  isCorrect: requiredStrBoolean("Is correct"),
});

const createTrueFalseQuestionSchema = z.object({
  body: z
    .object({
      ...baseQuestionSchema.shape,
      ...baseQuestionVersionSchema.shape,
      options: z
        .array(TrueFalseOptionSchema, {
          error: "Options should be a list",
        })
        .length(2, "True/False questions must have exactly 2 options"),
    })
    .superRefine((data, ctx) => {
      if (data?.options && data?.options?.length === 2) {
        const firstOpt = data.options[0];
        const secondOpt = data.options[1];

        if (firstOpt && secondOpt) {
          const firstContent = firstOpt.content.toLowerCase();
          const secondContent = secondOpt.content.toLowerCase();

          if (firstContent === secondContent) {
            ctx.addIssue({
              code: "custom",
              message:
                "True/False question must have one 'true' and one 'false' option.",
              path: ["options"],
            });
          }

          const correctItems = data.options.filter((opt) => opt.isCorrect);

          if (correctItems.length !== 1) {
            ctx.addIssue({
              code: "custom",
              message: "Exactly one correct option is required.",
              path: ["options"],
            });
          }

          if (firstOpt.sortOrder === secondOpt.sortOrder) {
            ctx.addIssue({
              code: "custom",
              message: "Options must have distinct sort orders.",
              path: ["options"],
            });
          }
        }
      }
    }),
});

const createTrueFalseMcqOptionSchema = createTrueFalseQuestionSchema;

/**
 * ========================================================
 * 4. FILL IN THE BLANK QUESTION SCHEMA
 * ========================================================
 */

const createFillBlankQuestionSchema = z.object({
  body: z
    .object({
      ...baseQuestionSchema.shape,
      ...baseQuestionVersionSchema.shape,
      acceptedAnswers: z
        .array(
          requiredString("Accepted answer")
            .trim()
            .min(1, "Accepted answer cannot be empty")
            .max(250, "Accepted answer cannot exceed 250 characters"),
          {
            error: "Accepted answers should be a list",
          },
        )
        .min(1, "At least 1 accepted answer is required")
        .max(20, "A maximum of 20 accepted answers are allowed"),
      isCaseSensitive: requiredStrBoolean("Is case sensitive")
        .default(false)
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (!data.stem?.includes("___")) {
        ctx.addIssue({
          code: "custom",
          message:
            "Fill-in-the-gap question stem must contain at least one blank (___).",
          path: ["stem"],
        });
      }

      if (data?.acceptedAnswers && data.acceptedAnswers.length > 0) {
        const hasEmpty = data.acceptedAnswers.some(
          (ans) => !ans || ans.trim().length === 0,
        );

        if (hasEmpty) {
          ctx.addIssue({
            code: "custom",
            message: "Accepted answers cannot be empty.",
            path: ["acceptedAnswers"],
          });
        }

        const isCaseSensitive = !!data.isCaseSensitive;
        const normalized = data.acceptedAnswers.map((ans) =>
          isCaseSensitive ? ans.trim() : ans.trim().toLowerCase(),
        );

        const uniqueSet = new Set(normalized);
        if (uniqueSet.size !== normalized.length) {
          ctx.addIssue({
            code: "custom",
            message: "Duplicate accepted answers are not allowed.",
            path: ["acceptedAnswers"],
          });
        }
      }
    }),
});

/**
 * ========================================================
 * 5. MATCHING QUESTION SCHEMA
 * ========================================================
 */

const matchingPairInputSchema = z.object({
  left: requiredString("Left item")
    .trim()
    .min(1, "Left item cannot be empty")
    .max(1000, "Left item cannot exceed 1000 characters")
    .transform((val) => sanitizeHtmlContent(val)),
  right: requiredString("Right item")
    .trim()
    .min(1, "Right item cannot be empty")
    .max(1000, "Right item cannot exceed 1000 characters")
    .transform((val) => sanitizeHtmlContent(val)),
});

const createMatchingQuestionSchema = z.object({
  body: z
    .object({
      ...baseQuestionSchema.shape,
      ...baseQuestionVersionSchema.shape,
      pairs: z
        .array(matchingPairInputSchema, {
          error: "Pairs should be a list",
        })
        .min(2, "At least 2 matching pairs are required")
        .max(10, "A maximum of 10 matching pairs are allowed"),
    })
    .superRefine((data, ctx) => {
      if (data?.pairs && data.pairs.length > 0) {
        // Check duplicate left items
        const leftItems = data.pairs.map((p) =>
          questionUtils.normalizeText(p.left),
        );
        const uniqueLefts = new Set(leftItems);
        if (uniqueLefts.size !== leftItems.length) {
          ctx.addIssue({
            code: "custom",
            message: "Duplicate left-side items are not allowed.",
            path: ["pairs"],
          });
        }

        // Check duplicate right items
        const rightItems = data.pairs.map((p) =>
          questionUtils.normalizeText(p.right),
        );
        const uniqueRights = new Set(rightItems);
        if (uniqueRights.size !== rightItems.length) {
          ctx.addIssue({
            code: "custom",
            message: "Duplicate right-side items are not allowed.",
            path: ["pairs"],
          });
        }
      }
    }),
});

/**
 * ========================================================
 * 6. ORDERING QUESTION SCHEMA
 * ========================================================
 */

const orderingItemInputSchema = z.object({
  text: requiredString("Item text")
    .trim()
    .min(1, "Item text cannot be empty")
    .max(1000, "Item text cannot exceed 1000 characters")
    .transform((val) => sanitizeHtmlContent(val)),
  correctOrder: positiveNumber("Correct order"),
});

const createOrderingQuestionSchema = z.object({
  body: z
    .object({
      ...baseQuestionSchema.shape,
      ...baseQuestionVersionSchema.shape,
      orderingItems: z
        .array(orderingItemInputSchema, {
          error: "Ordering items should be a list",
        })
        .min(2, "At least 2 ordering items are required")
        .max(10, "A maximum of 10 ordering items are allowed"),
    })
    .superRefine((data, ctx) => {
      if (data?.orderingItems && data.orderingItems.length > 0) {
        // Check duplicate text
        const texts = data.orderingItems.map((item) =>
          questionUtils.normalizeText(item.text),
        );
        const uniqueTexts = new Set(texts);
        if (uniqueTexts.size !== texts.length) {
          ctx.addIssue({
            code: "custom",
            message: "Duplicate item texts are not allowed in ordering items.",
            path: ["orderingItems"],
          });
        }

        // Check unique correctOrder
        const orders = data.orderingItems.map((item) => item.correctOrder);
        const uniqueOrders = new Set(orders);
        if (uniqueOrders.size !== orders.length) {
          ctx.addIssue({
            code: "custom",
            message: "Each ordering item must have a unique correctOrder.",
            path: ["orderingItems"],
          });
        }

        // Check sequential orders starting from 1 to N
        const sortedOrders = [...orders].sort((a, b) => a - b);
        for (let i = 0; i < sortedOrders.length; i++) {
          if (sortedOrders[i] !== i + 1) {
            ctx.addIssue({
              code: "custom",
              message: `correctOrder values must form a continuous sequence from 1 to ${data.orderingItems.length}.`,
              path: ["orderingItems"],
            });
            break;
          }
        }
      }
    }),
});

/**
 * ========================================================
 * UPDATE QUESTION SCHEMAS (SEPARATE BY TYPE)
 * ========================================================
 */

// Update Base Schema common fields:
const updateBaseQuestionSchema = z.object({
  difficulty: enumString(QUESTION_DIFFICULTY_VALUES, "Difficulty").optional(),
  passageId: requiredMongooseId("Passage ID").optional().nullable(),
});

// Update Base Question Version Schema:
const updateBaseQuestionVersionSchema = z.object({
  stem: z
    .string()
    .trim()
    .min(1, "Question stem cannot be empty")
    .max(2500, "Question stem cannot exceed 2500 characters")
    .transform((val) => sanitizeHtmlContent(val))
    .optional(),
  explanation: z
    .string()
    .trim()
    .max(10_000, "Explanation cannot exceed 10,000 characters")
    .optional()
    .nullable()
    .transform((val) => (val ? sanitizeHtmlContent(val) : val)),
  mediaUrl: optionalString("Media url").nullable().optional(),
  changeLog: z
    .string()
    .trim()
    .max(500, "Change log cannot exceed 500 characters")
    .optional(),
});

// 1. UPDATE SINGLE MCQ SCHEMA
const updateSingleMcqQuestionSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Question ID"),
  }),
  body: z
    .object({
      ...updateBaseQuestionSchema.shape,
      ...updateBaseQuestionVersionSchema.shape,
      options: z
        .array(OptionsSchema, {
          error: "Options should be a list",
        })
        .min(2, "At least 2 options are required")
        .max(10, "A maximum of 10 options are allowed")
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (data?.options && data?.options?.length > 0) {
        const hasDuplicateOption = questionUtils.hasDuplicateOptions(
          data?.options as IQuestionOption[],
        );

        if (hasDuplicateOption) {
          ctx.addIssue({
            code: "custom",
            message: "Duplicate options are not allowed.",
            path: ["options"],
          });
        }

        const correctItems = data?.options?.filter((opt) => opt.isCorrect);

        if (correctItems.length !== 1) {
          ctx.addIssue({
            code: "custom",
            message: "Exactly one correct option is required.",
            path: ["options"],
          });
        }
      }
    }),
});

// 2. UPDATE MULTI MCQ SCHEMA
const updateMultiMcqQuestionSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Question ID"),
  }),
  body: z
    .object({
      ...updateBaseQuestionSchema.shape,
      ...updateBaseQuestionVersionSchema.shape,
      options: z
        .array(OptionsSchema, {
          error: "Options should be a list",
        })
        .min(2, "At least 2 options are required")
        .max(10, "A maximum of 10 options are allowed")
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (data?.options && data?.options?.length > 0) {
        const hasDuplicateOption = questionUtils.hasDuplicateOptions(
          data?.options as IQuestionOption[],
        );

        if (hasDuplicateOption) {
          ctx.addIssue({
            code: "custom",
            message: "Duplicate options are not allowed.",
            path: ["options"],
          });
        }

        const correctItems = data?.options?.filter((opt) => opt.isCorrect);

        if (correctItems.length < 1) {
          ctx.addIssue({
            code: "custom",
            message: "At least one correct option is required.",
            path: ["options"],
          });
        }
      }
    }),
});

// 3. UPDATE TRUE / FALSE SCHEMA
const updateTrueFalseQuestionSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Question ID"),
  }),
  body: z
    .object({
      ...updateBaseQuestionSchema.shape,
      ...updateBaseQuestionVersionSchema.shape,
      options: z
        .array(TrueFalseOptionSchema, {
          error: "Options should be a list",
        })
        .length(2, "True/False questions must have exactly 2 options")
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (data?.options && data?.options?.length === 2) {
        const firstOpt = data.options[0];
        const secondOpt = data.options[1];

        if (firstOpt && secondOpt) {
          const firstContent = firstOpt.content.toLowerCase();
          const secondContent = secondOpt.content.toLowerCase();

          if (firstContent === secondContent) {
            ctx.addIssue({
              code: "custom",
              message:
                "True/False question must have one 'true' and one 'false' option.",
              path: ["options"],
            });
          }

          const correctItems = data.options.filter((opt) => opt.isCorrect);

          if (correctItems.length !== 1) {
            ctx.addIssue({
              code: "custom",
              message: "Exactly one correct option is required.",
              path: ["options"],
            });
          }

          if (firstOpt.sortOrder === secondOpt.sortOrder) {
            ctx.addIssue({
              code: "custom",
              message: "Options must have distinct sort orders.",
              path: ["options"],
            });
          }
        }
      }
    }),
});

// 4. UPDATE FILL IN THE BLANK SCHEMA
const updateFillBlankQuestionSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Question ID"),
  }),
  body: z
    .object({
      ...updateBaseQuestionSchema.shape,
      ...updateBaseQuestionVersionSchema.shape,
      acceptedAnswers: z
        .array(
          requiredString("Accepted answer")
            .trim()
            .min(1, "Accepted answer cannot be empty")
            .max(250, "Accepted answer cannot exceed 250 characters"),
          {
            error: "Accepted answers should be a list",
          },
        )
        .min(1, "At least 1 accepted answer is required")
        .max(20, "A maximum of 20 accepted answers are allowed")
        .optional(),
      isCaseSensitive: requiredStrBoolean("Is case sensitive").optional(),
    })
    .superRefine((data, ctx) => {
      if (data.stem && !data.stem.includes("___")) {
        ctx.addIssue({
          code: "custom",
          message:
            "Fill-in-the-gap question stem must contain at least one blank (___).",
          path: ["stem"],
        });
      }

      if (data?.acceptedAnswers && data.acceptedAnswers.length > 0) {
        const hasEmpty = data.acceptedAnswers.some(
          (ans) => !ans || ans.trim().length === 0,
        );

        if (hasEmpty) {
          ctx.addIssue({
            code: "custom",
            message: "Accepted answers cannot be empty.",
            path: ["acceptedAnswers"],
          });
        }

        const isCaseSensitive = !!data.isCaseSensitive;
        const normalized = data.acceptedAnswers.map((ans) =>
          isCaseSensitive ? ans.trim() : ans.trim().toLowerCase(),
        );

        const uniqueSet = new Set(normalized);
        if (uniqueSet.size !== normalized.length) {
          ctx.addIssue({
            code: "custom",
            message: "Duplicate accepted answers are not allowed.",
            path: ["acceptedAnswers"],
          });
        }
      }
    }),
});

// 5. UPDATE MATCHING SCHEMA
const updateMatchingQuestionSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Question ID"),
  }),
  body: z
    .object({
      ...updateBaseQuestionSchema.shape,
      ...updateBaseQuestionVersionSchema.shape,
      pairs: z
        .array(matchingPairInputSchema, {
          error: "Pairs should be a list",
        })
        .min(2, "At least 2 matching pairs are required")
        .max(10, "A maximum of 10 matching pairs are allowed")
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (data?.pairs && data.pairs.length > 0) {
        const leftItems = data.pairs.map((p) =>
          questionUtils.normalizeText(p.left),
        );
        const uniqueLefts = new Set(leftItems);
        if (uniqueLefts.size !== leftItems.length) {
          ctx.addIssue({
            code: "custom",
            message: "Duplicate left-side items are not allowed.",
            path: ["pairs"],
          });
        }

        const rightItems = data.pairs.map((p) =>
          questionUtils.normalizeText(p.right),
        );
        const uniqueRights = new Set(rightItems);
        if (uniqueRights.size !== rightItems.length) {
          ctx.addIssue({
            code: "custom",
            message: "Duplicate right-side items are not allowed.",
            path: ["pairs"],
          });
        }
      }
    }),
});

// 6. UPDATE ORDERING SCHEMA
const updateOrderingQuestionSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Question ID"),
  }),
  body: z
    .object({
      ...updateBaseQuestionSchema.shape,
      ...updateBaseQuestionVersionSchema.shape,
      orderingItems: z
        .array(orderingItemInputSchema, {
          error: "Ordering items should be a list",
        })
        .min(2, "At least 2 ordering items are required")
        .max(10, "A maximum of 10 ordering items are allowed")
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (data?.orderingItems && data.orderingItems.length > 0) {
        const texts = data.orderingItems.map((item) =>
          questionUtils.normalizeText(item.text),
        );
        const uniqueTexts = new Set(texts);
        if (uniqueTexts.size !== texts.length) {
          ctx.addIssue({
            code: "custom",
            message: "Duplicate item texts are not allowed in ordering items.",
            path: ["orderingItems"],
          });
        }

        const orders = data.orderingItems.map((item) => item.correctOrder);
        const uniqueOrders = new Set(orders);
        if (uniqueOrders.size !== orders.length) {
          ctx.addIssue({
            code: "custom",
            message: "Each ordering item must have a unique correctOrder.",
            path: ["orderingItems"],
          });
        }

        const sortedOrders = [...orders].sort((a, b) => a - b);
        for (let i = 0; i < sortedOrders.length; i++) {
          if (sortedOrders[i] !== i + 1) {
            ctx.addIssue({
              code: "custom",
              message: `correctOrder values must form a continuous sequence from 1 to ${data.orderingItems.length}.`,
              path: ["orderingItems"],
            });
            break;
          }
        }
      }
    }),
});

// Export all schemas:
export const questionValidations = {
  createSingleMcqQuestionSchema,
  createMultiMcqOptionSchema,
  createTrueFalseQuestionSchema,
  createTrueFalseMcqOptionSchema,
  createFillBlankQuestionSchema,
  createMatchingQuestionSchema,
  createOrderingQuestionSchema,

  // Update Schemas:
  updateSingleMcqQuestionSchema,
  updateMultiMcqQuestionSchema,
  updateTrueFalseQuestionSchema,
  updateFillBlankQuestionSchema,
  updateMatchingQuestionSchema,
  updateOrderingQuestionSchema,
};

// Export all payload types:
export type TCreateSingleMcqQuestionPayloadType = z.infer<
  typeof createSingleMcqQuestionSchema.shape.body
>;

export type TCreateMultiMcqQuestionSchema = z.infer<
  typeof createMultiMcqOptionSchema.shape.body
>;

export type TCreateTrueFalseQuestionPayloadType = z.infer<
  typeof createTrueFalseQuestionSchema.shape.body
>;

export type TCreateTrueFalseMcqQuestionSchema =
  TCreateTrueFalseQuestionPayloadType;

export type TCreateFillBlankQuestionPayloadType = z.infer<
  typeof createFillBlankQuestionSchema.shape.body
>;

export type TCreateMatchingQuestionPayloadType = z.infer<
  typeof createMatchingQuestionSchema.shape.body
>;

export type TCreateOrderingQuestionPayloadType = z.infer<
  typeof createOrderingQuestionSchema.shape.body
>;

// Export update payload types:
export type TUpdateSingleMcqQuestionPayloadType = z.infer<
  typeof updateSingleMcqQuestionSchema.shape.body
>;

export type TUpdateMultiMcqQuestionPayloadType = z.infer<
  typeof updateMultiMcqQuestionSchema.shape.body
>;

export type TUpdateTrueFalseQuestionPayloadType = z.infer<
  typeof updateTrueFalseQuestionSchema.shape.body
>;

export type TUpdateFillBlankQuestionPayloadType = z.infer<
  typeof updateFillBlankQuestionSchema.shape.body
>;

export type TUpdateMatchingQuestionPayloadType = z.infer<
  typeof updateMatchingQuestionSchema.shape.body
>;

export type TUpdateOrderingQuestionPayloadType = z.infer<
  typeof updateOrderingQuestionSchema.shape.body
>;


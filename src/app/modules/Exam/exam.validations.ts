import z from "zod";
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
} from "../../utils";
import {
  examLevelValues,
  examTypeValues,
  examStatusValues,
  generationModeValues,
  examSortableFields,
  EXAM_LEVEL,
  EXAM_TYPE,
  GENERATION_MODE,
} from "./exam.constants";

import { sortOrderValues } from "../../constants";

// Shared Base Schema Shape for Exam Creation
const baseExamBodySchema = {
  title: requiredString("Title"),
  description: optionalString("Description"),

  // Generation Mode
  generationMode: enumString(
    generationModeValues,
    "Generation mode",
  ).default(GENERATION_MODE.MANUAL),

  // Time and Marks Settings
  durationMins: requiredNumber("Duration minutes").min(
    1,
    "Duration must be at least 1 minute",
  ),
  totalQuestions: requiredNumber("Total questions").min(
    1,
    "Total questions must be at least 1",
  ),
  marksPerQuestion: requiredNumber("Marks per question").min(
    0.1,
    "Marks per question must be at least 0.1",
  ),
  negativeMarks: optionalNumber("Negative marks").default(0),
  passMarks: requiredNumber("Pass marks").min(
    0,
    "Pass marks cannot be negative",
  ),

  // Question Mappings (Manual mode)
  questionMappings: z
    .array(requiredMongooseId("Question Mapping"))
    .optional()
    .default([]),

  // Configurations
  isRandomized: requiredStrBoolean("Is randomized")
    .optional()
    .default(true),
  isOptionShuffled: requiredStrBoolean("Is option shuffled")
    .optional()
    .default(true),
  isSpeedTest: requiredStrBoolean("Is speed test")
    .optional()
    .default(false),

  // Scheduling & Type
  examType: enumString(examTypeValues, "Exam type").default(
    EXAM_TYPE.MODEL_TEST,
  ),
  startTime: optionalDate("Start time"),
  endTime: optionalDate("End time"),
};

// Common Refinement Validation for All Exam Creation Schemas
const validateExamCommonRefinements = (data: any, ctx: z.RefinementCtx) => {
  // 1. Marks and Negative Marks Logical Consistency
  const calculatedTotalMarks = data.totalQuestions * data.marksPerQuestion;
  if (data.passMarks > calculatedTotalMarks) {
    ctx.addIssue({
      code: "custom",
      path: ["passMarks"],
      message: `Pass marks (${data.passMarks}) cannot exceed total possible marks (${calculatedTotalMarks}).`,
    });
  }

  if (data.negativeMarks >= data.marksPerQuestion) {
    ctx.addIssue({
      code: "custom",
      path: ["negativeMarks"],
      message: `Negative marks (${data.negativeMarks}) must be less than marks per question (${data.marksPerQuestion}).`,
    });
  }

  // 2. Scheduling Validation for Live Exams
  if (data.examType === EXAM_TYPE.LIVE) {
    if (!data.startTime) {
      ctx.addIssue({
        code: "custom",
        path: ["startTime"],
        message: "Start time is required for live exams.",
      });
    }
    if (!data.endTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "End time is required for live exams.",
      });
    }
    if (data.startTime && data.endTime) {
      const startMs = new Date(data.startTime).getTime();
      const endMs = new Date(data.endTime).getTime();

      if (startMs < Date.now()) {
        ctx.addIssue({
          code: "custom",
          path: ["startTime"],
          message: "Start time cannot be in the past for live exams.",
        });
      }
      if (startMs >= endMs) {
        ctx.addIssue({
          code: "custom",
          path: ["endTime"],
          message: "End time must be after start time.",
        });
      }

      const windowMins = (endMs - startMs) / (1000 * 60);
      if (windowMins !== data.durationMins) {
        ctx.addIssue({
          code: "custom",
          path: ["durationMins"],
          message: `For strict live exams, the time window (${windowMins} mins) must be exactly equal to the exam duration (${data.durationMins} mins).`,
        });
      }
    }
  }

  // 3. Check question count for manual generation mode:
  if (data.generationMode === GENERATION_MODE.MANUAL) {
    if (
      !data.questionMappings ||
      data.questionMappings.length !== data.totalQuestions
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["questionMappings"],
        message: `You must provide exactly ${data.totalQuestions} question mappings (received ${data.questionMappings?.length || 0}).`,
      });
    }
  }

  // 4. Duplicate Question Check for Manual Mode
  if (
    data.generationMode === GENERATION_MODE.MANUAL &&
    data.questionMappings &&
    data.questionMappings.length > 0
  ) {
    const uniqueSet = new Set(
      data.questionMappings.map((id: any) => id.toString()),
    );
    if (uniqueSet.size !== data.questionMappings.length) {
      ctx.addIssue({
        code: "custom",
        path: ["questionMappings"],
        message: "Duplicate questions detected in question mappings.",
      });
    }
  }
};

// 1. CREATE CATEGORY LEVEL EXAM SCHEMA
const createCategoryLevelExamSchema = z.object({
  body: z
    .object({
      ...baseExamBodySchema,
      category: requiredMongooseId("Category"),
    })
    .superRefine(validateExamCommonRefinements),
});

// 2. CREATE TRACK LEVEL EXAM SCHEMA
const createTrackLevelExamSchema = z.object({
  body: z
    .object({
      ...baseExamBodySchema,
      category: requiredMongooseId("Category"),
      track: requiredMongooseId("Track"),
    })
    .superRefine(validateExamCommonRefinements),
});

// 3. CREATE SUBJECT LEVEL EXAM SCHEMA
const createSubjectLevelExamSchema = z.object({
  body: z
    .object({
      ...baseExamBodySchema,
      subject: requiredMongooseId("Subject"),
      category: optionalString("Category ID").nullable(),
    })
    .superRefine(validateExamCommonRefinements),
});

// 4. CREATE TOPIC LEVEL EXAM SCHEMA
const createTopicLevelExamSchema = z.object({
  body: z
    .object({
      ...baseExamBodySchema,
      subject: requiredMongooseId("Subject"),
      topics: z
        .array(requiredMongooseId("Topic"))
        .min(1, "At least one topic must be selected"),
      category: optionalString("Category ID").nullable(),
    })
    .superRefine((data, ctx) => {
      validateExamCommonRefinements(data, ctx);
      if (data.topics && data.topics.length > 0) {
        const uniqueTopics = new Set(data.topics.map((t: any) => t.toString()));
        if (uniqueTopics.size !== data.topics.length) {
          ctx.addIssue({
            code: "custom",
            path: ["topics"],
            message: "Duplicate topics detected.",
          });
        }
      }
    }),
});

// 2. UPDATE EXAM SCHEMA
const updateExamSchema = z.object({
  params: z.object({
    id: requiredString("Exam ID"),
  }),
  body: z
    .object({
      title: optionalString("Title"),
      description: optionalString("Description"),

      durationMins: optionalNumber("Duration minutes"),
      marksPerQuestion: optionalNumber("Marks per question"),
      negativeMarks: optionalNumber("Negative marks"),
      passMarks: optionalNumber("Pass marks"),

      isRandomized: requiredStrBoolean("Is randomized").optional(),
      isOptionShuffled: requiredStrBoolean("Is option shuffled").optional(),
      isSpeedTest: requiredStrBoolean("Is speed test").optional(),

      examType: optionalEnumString(examTypeValues, "Exam type"),
      startTime: optionalDate("Start time"),
      endTime: optionalDate("End time"),
    })
    .superRefine((data, ctx) => {
      if (data.startTime && data.endTime) {
        const startMs = new Date(data.startTime).getTime();
        const endMs = new Date(data.endTime).getTime();
        if (startMs >= endMs) {
          ctx.addIssue({
            code: "custom",
            path: ["endTime"],
            message: "End time must be after start time.",
          });
        }
      }
    }),
});

// 3. GET ALL EXAM SCHEMA
const getAllExamSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
    sortBy: optionalEnumString(examSortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date"),

    // Filters
    examLevel: optionalEnumString(examLevelValues, "Exam level"),
    examType: optionalEnumString(examTypeValues, "Exam type"),
    status: optionalEnumString(examStatusValues, "Status"),
    category: optionalString("Category ID"),
    track: optionalString("Track ID"),
    subject: optionalString("Subject ID"),
  }),
});

// 4. GET EXAM BY ID / SLUG SCHEMA
const getExamByIdSchema = z.object({
  params: z.object({
    id: requiredString("Exam ID"),
  }),
});

// 5. DELETE EXAM BY ID SCHEMA
const deleteExamByIdSchema = z.object({
  params: z.object({
    id: requiredString("Exam ID"),
  }),
});

// 6. MARK EXAM AS PUBLISHED SCHEMA
const markExamAsPublishedSchema = z.object({
  params: z.object({
    id: requiredString("Exam ID"),
  }),
});

// 7. MARK EXAM AS ARCHIVED SCHEMA
const markExamAsArchivedSchema = z.object({
  params: z.object({
    id: requiredString("Exam ID"),
  }),
});

// 8. MARK EXAM AS DRAFT SCHEMA
const markExamAsDraftSchema = z.object({
  params: z.object({
    id: requiredString("Exam ID"),
  }),
});

export const examValidations = {
  createExamSchema: createCategoryLevelExamSchema,
  createCategoryLevelExamSchema,
  createTrackLevelExamSchema,
  createSubjectLevelExamSchema,
  createTopicLevelExamSchema,
  updateExamSchema,
  getAllExamSchema,
  getExamByIdSchema,
  deleteExamByIdSchema,
  markExamAsPublishedSchema,
  markExamAsArchivedSchema,
  markExamAsDraftSchema,
};

export type TCreateCategoryLevelExamPayloadType = z.infer<
  typeof createCategoryLevelExamSchema.shape.body
>;
export type TCreateTrackLevelExamPayloadType = z.infer<
  typeof createTrackLevelExamSchema.shape.body
>;
export type TCreateSubjectLevelExamPayloadType = z.infer<
  typeof createSubjectLevelExamSchema.shape.body
>;
export type TCreateTopicLevelExamPayloadType = z.infer<
  typeof createTopicLevelExamSchema.shape.body
>;
export type TUpdateExamPayloadType = z.infer<
  typeof updateExamSchema.shape.body
>;
export type TGetAllExamQueryParamsType = z.infer<
  typeof getAllExamSchema.shape.query
>;
export type TGetExamByIdParamsType = z.infer<
  typeof getExamByIdSchema.shape.params
>;
export type TDeleteExamByIdParamsType = z.infer<
  typeof deleteExamByIdSchema.shape.params
>;

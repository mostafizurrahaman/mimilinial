import z from "zod";
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  requiredMongooseId,
  requiredNumber,
  multipleMongooseId,
  requiredStrBoolean,
} from "../../utils";
import { questionMappingSortableFields } from "./question-mapping.constants";
import { sortOrderValues } from "../../constants";
import { QUESTION_DIFFICULTY_VALUES, QUESTION_TYPE_VALUES } from "../Questions";

// 1. CREATE QUESTION MAPPING
const createQuestionMappingSchema = z.object({
  body: z.object({
    question: requiredMongooseId("Question ID"),
    coll: requiredString("Collection ID"),
    category: requiredMongooseId("Category ID"),
    track: requiredMongooseId("Track ID").optional(),
    subject: requiredMongooseId("Subject ID"),
    topic: requiredMongooseId("Topic ID"),
    pastExam: requiredMongooseId("Past Exam").optional(),
    year: requiredString("Year").regex(
      /^(19[7-9]\d|20\d{2}|2100)$/,
      "Provide a valid year between 1971 and 2100.",
    ),
    marks: requiredNumber("Marks").min(0.25, "Marks must be at least 0.25."),
    sortOrder: requiredNumber("Sort order")
      .min(0, "Sort Order must be at least 0.")
      .default(0),
  }),
});

// 2. UPDATE QUESTION MAPPING
const updateQuestionMappingSchema = z.object({
  params: z.object({
    id: requiredString("ID"),
  }),
  body: z.object({
    question: requiredMongooseId("Question ID").optional(),
    coll: requiredString("Collection ID").optional(),
    category: requiredMongooseId("Category ID").optional(),
    track: requiredMongooseId("Track ID").optional().optional(),
    subject: requiredMongooseId("Subject ID").optional(),
    topic: requiredMongooseId("Topic ID").optional(),
    pastExam: requiredMongooseId("Past Exam").optional().optional(),
    year: requiredString("Year")
      .regex(
        /^(19[7-9]\d|20\d{2}|2100)$/,
        "Provide a valid year between 1971 and 2100.",
      )
      .optional(),
    marks: requiredNumber("Marks")
      .min(0.25, "Marks must be at least 0.25.")
      .optional()
      .default(1),
    sortOrder: requiredNumber("Sort order")
      .min(0, "Sort Order must be at least 0.")
      .optional()
      .default(0),
  }),
});

// 3. GET ALL QUESTION MAPPING
const getAllQuestionMappingSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
    sortBy: optionalEnumString(questionMappingSortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date"),

    // Question IDS:
    questionIds: multipleMongooseId("Question ID").optional(),
    collectionIds: multipleMongooseId("Collection ID").optional(),
    categoryIds: multipleMongooseId("Category ID").optional(),
    trackIds: multipleMongooseId("Track ID").optional(),
    subjectIds: multipleMongooseId("Subject ID").optional(),
    topicIds: multipleMongooseId("Topic ID").optional(),
    pastExamIds: multipleMongooseId("Past Exam").optional(),
    year: requiredString("Year")
      .regex(
        /^(19[7-9]\d|20\d{2}|2100)$/,
        "Provide a valid year between 1971 and 2100.",
      )
      .optional(),

    // Question Filters:
    type: z
      .array(optionalEnumString(QUESTION_TYPE_VALUES, "Question type"), {
        error: "Type must be list of question type.",
      })
      .optional(),
    difficulty: z.array(
      optionalEnumString(QUESTION_DIFFICULTY_VALUES, "Difficulty"),
      {
        error: "Difficulty must be list of difficulty type.",
      },
    ),
    includeInActiveQuestion: requiredStrBoolean("Include inactive question")
      .optional()
      .default(false),
  }),
});

// 4. GET QUESTION MAPPING BY ID
const getQuestionMappingByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID"),
  }),
});

// 5. DELETE QUESTION MAPPING BY ID
const deleteQuestionMappingByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID"),
  }),
});

export const questionMappingValidations = {
  createQuestionMappingSchema,
  updateQuestionMappingSchema,
  getAllQuestionMappingSchema,
  getQuestionMappingByIdSchema,
  deleteQuestionMappingByIdSchema,
};

export type TCreateQuestionMappingPayloadType = z.infer<
  typeof createQuestionMappingSchema.shape.body
>;
export type TUpdateQuestionMappingPayloadType = z.infer<
  typeof updateQuestionMappingSchema.shape.body
>;
export type TGetAllQuestionMappingQueryParamsType = z.infer<
  typeof getAllQuestionMappingSchema.shape.query
>;
export type TGetQuestionMappingByIdParamsType = z.infer<
  typeof getQuestionMappingByIdSchema.shape.params
>;
export type TDeleteQuestionMappingByIdParamsType = z.infer<
  typeof deleteQuestionMappingByIdSchema.shape.params
>;

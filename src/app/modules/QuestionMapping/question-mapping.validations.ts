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
} from "../../utils";
import { questionMappingSortableFields } from "./question-mapping.constants";
import { sortOrderValues } from "../../constants";

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
    question: multipleMongooseId("Question ID").optional(),
    coll: multipleMongooseId("Collection ID").optional(),
    category: multipleMongooseId("Category ID").optional(),
    track: multipleMongooseId("Track ID").optional(),
    subject: multipleMongooseId("Subject ID").optional(),
    topic: multipleMongooseId("Topic ID").optional(),
    pastExam: multipleMongooseId("Past Exam").optional(),
    year: requiredString("Year")
      .regex(
        /^(19[7-9]\d|20\d{2}|2100)$/,
        "Provide a valid year between 1971 and 2100.",
      )
      .optional(),
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

import z from "zod";
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  requiredMongooseId,
  multipleMongooseId,
} from "../../utils";
import {
  EXAM_STATUS_VALUES,
  pastExamProjectTypes,
  pastExamSortableFields,
} from "./past-exam.constants";
import { sortOrderValues } from "../../constants";
import { sanitizeHtmlContent } from "../Questions/sanitize-html";
import { categoryStatusValues } from "../Category";
import { trackStatusValues } from "../Track";

// 1. CREATE PAST EXAM
const createPastExamSchema = z.object({
  body: z.object({
    category: requiredMongooseId("Category ID"),
    track: requiredMongooseId("Track ID").optional().nullish(),
    nameEn: requiredString("Name English"),
    nameBn: requiredString("Name Bangla"),
    year: requiredString("Year").regex(
      /^(19[7-9]\d|20\d{2}|2100)$/,
      "Provide a valid year between 1971 and 2100.",
    ),
    description: optionalString("Description")
      .transform((val) => (val ? sanitizeHtmlContent(val as string) : val))
      .nullish(),
    totalQuestions: optionalNumber("Total questions").default(0),
  }),
});

// 2. UPDATE PAST EXAM
const updatePastExamSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Past Exam ID"),
  }),
  body: z.object({
    category: requiredMongooseId("Category ID").optional(),
    track: requiredMongooseId("Track ID").optional().nullish(),
    nameEn: optionalString("Name English"),
    nameBn: optionalString("Name Bangla"),
    year: requiredString("Year")
      .regex(
        /^(19[7-9]\d|20\d{2}|2100)$/,
        "Provide a valid year between 1971 and 2100.",
      )
      .optional(),
    description: optionalString("Description")
      .transform((val) => (val ? sanitizeHtmlContent(val as string) : val))
      .nullish(),
    totalQuestions: optionalNumber("Total questions"),
    status: optionalEnumString(EXAM_STATUS_VALUES, "Exam status"),
  }),
});

// 3. GET ALL PAST EXAM
const getAllPastExamSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
    sortBy: optionalEnumString(pastExamSortableFields, "Sort by"),
    categoryIds: multipleMongooseId("Category ID").optional(),
    trackIds: multipleMongooseId("Track ID").optional(),
    year: optionalString("Year"),
    status: optionalEnumString(EXAM_STATUS_VALUES, "Exam status"),
    categoryStatus: optionalEnumString(categoryStatusValues, "Category status"),
    trackStatus: optionalEnumString(trackStatusValues, "Track status"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date"),
    projection: optionalEnumString(
      pastExamProjectTypes,
      "Projection",
    ).default("details"),
  }),
});

// 3.1 GET ALL PUBLISHED PAST EXAM
const getAllPublishedPastExamSchema = z.object({
  query: getAllPastExamSchema.shape.query.omit({
    status: true,
    categoryStatus: true,
    trackStatus: true,
  }),
});

// 4. GET PAST EXAM BY ID
const getPastExamByIdSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Past Exam ID"),
  }),
});

// 4.1 GET PAST EXAM BY SLUG
const getPastExamBySlugSchema = z.object({
  params: z.object({
    slug: requiredString("Slug"),
  }),
});

// 5. DELETE PAST EXAM BY ID
const deletePastExamByIdSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Past Exam ID"),
  }),
});

// 6. MARK AS PUBLISHED
const markPastExamAsPublishedSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Past Exam ID"),
  }),
});

// 7. MARK AS ARCHIVED
const markPastExamAsArchivedSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Past Exam ID"),
  }),
});

export const pastExamValidations = {
  createPastExamSchema,
  updatePastExamSchema,
  getAllPastExamSchema,
  getAllPublishedPastExamSchema,
  getPastExamByIdSchema,
  getPastExamBySlugSchema,
  deletePastExamByIdSchema,
  markPastExamAsPublishedSchema,
  markPastExamAsArchivedSchema,
};

export type TCreatePastExamPayloadType = z.infer<
  typeof createPastExamSchema.shape.body
>;
export type TUpdatePastExamPayloadType = z.infer<
  typeof updatePastExamSchema.shape.body
>;
export type TGetAllPastExamQueryParamsType = z.infer<
  typeof getAllPastExamSchema.shape.query
>;
export type TGetAllPublishedPastExamQueryParamsType = z.infer<
  typeof getAllPublishedPastExamSchema.shape.query
>;
export type TGetPastExamByIdParamsType = z.infer<
  typeof getPastExamByIdSchema.shape.params
>;
export type TGetPastExamBySlugParamsType = z.infer<
  typeof getPastExamBySlugSchema.shape.params
>;
export type TDeletePastExamByIdParamsType = z.infer<
  typeof deletePastExamByIdSchema.shape.params
>;
export type TMarkPastExamAsPublishedParamsType = z.infer<
  typeof markPastExamAsPublishedSchema.shape.params
>;
export type TMarkPastExamAsArchivedParamsType = z.infer<
  typeof markPastExamAsArchivedSchema.shape.params
>;

import z from "zod";
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  requiredMongooseId,
  requiredNumber,
} from "../../utils";
import { pastExamSortableFields } from "./past-exam.constants";
import { sortOrderValues } from "../../constants";

// 1. CREATE PAST EXAM
const createPastExamSchema = z.object({
  body: z.object({
    category: requiredMongooseId("Category ID"),
    track: requiredMongooseId("Track ID").optional(),
    nameEn: requiredString("Name English"),
    nameBn: requiredString("Name Bangla"),
    year: requiredString("Year").regex(
      /^(19[7-9]\d|20\d{2}|2100)$/,
      "Provide a valid year between 1971 and 2100.",
    ),
    description: optionalString("Description"),
  }),
});

// 2. UPDATE PAST EXAM
const updatePastExamSchema = z.object({
  params: z.object({
    id: requiredString("ID"),
  }),
  body: z.object({}),
});

// 3. GET ALL PAST EXAM
const getAllPastExamSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
    sortBy: optionalEnumString(pastExamSortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date"),
  }),
});

// 4. GET PAST EXAM BY ID
const getPastExamByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID"),
  }),
});

// 5. DELETE PAST EXAM BY ID
const deletePastExamByIdSchema = z.object({
  params: z.object({
    id: requiredString("ID"),
  }),
});

export const pastExamValidations = {
  createPastExamSchema,
  updatePastExamSchema,
  getAllPastExamSchema,
  getPastExamByIdSchema,
  deletePastExamByIdSchema,
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
export type TGetPastExamByIdParamsType = z.infer<
  typeof getPastExamByIdSchema.shape.params
>;
export type TDeletePastExamByIdParamsType = z.infer<
  typeof deletePastExamByIdSchema.shape.params
>;

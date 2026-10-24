import z from "zod";
import {
   requiredString,
   optionalNumber,
   optionalEnumString,
   optionalString,
   optionalDate,
} from "../../utils";
import { questionMappingSortableFields } from "./question-mapping.constants";
import { sortOrderValues } from "../../constants";

// 1. CREATE QUESTION MAPPING
const createQuestionMappingSchema = z.object({
   body: z.object({}),
});

// 2. UPDATE QUESTION MAPPING
const updateQuestionMappingSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
   body: z.object({}),
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

export type TCreateQuestionMappingPayloadType = z.infer<typeof createQuestionMappingSchema.shape.body>;
export type TUpdateQuestionMappingPayloadType = z.infer<typeof updateQuestionMappingSchema.shape.body>;
export type TGetAllQuestionMappingQueryParamsType = z.infer<typeof getAllQuestionMappingSchema.shape.query>;
export type TGetQuestionMappingByIdParamsType = z.infer<typeof getQuestionMappingByIdSchema.shape.params>;
export type TDeleteQuestionMappingByIdParamsType = z.infer<typeof deleteQuestionMappingByIdSchema.shape.params>;

import z from "zod";
import {
   requiredString,
   optionalNumber,
   optionalEnumString,
   optionalString,
   optionalDate,
   positiveNumber,
   requiredStrBoolean,
} from "../../utils";
import { questionVersionSortableFields } from "./question-version.constants";
import { sortOrderValues } from "../../constants";








// 1. CREATE QUESTION VERSION
const createSingleMcqQuestionVersionSchema = z.object({
   body: z.object({}),
});

// 2. UPDATE QUESTION VERSION
const updateQuestionVersionSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
   body: z.object({}),
});

// 3. GET ALL QUESTION VERSION
const getAllQuestionVersionSchema = z.object({
   query: z.object({
      page: optionalNumber("Page"),
      limit: optionalNumber("Limit"),
      searchTerm: optionalString("Search term"),
      sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
      sortBy: optionalEnumString(questionVersionSortableFields, "Sort by"),
      fromDate: optionalDate("From date"),
      toDate: optionalDate("To date"),
   }),
});

// 4. GET QUESTION VERSION BY ID
const getQuestionVersionByIdSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
});

// 5. DELETE QUESTION VERSION BY ID
const deleteQuestionVersionByIdSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
});

export const questionVersionValidations = {
   createQuestionVersionSchema,
   updateQuestionVersionSchema,
   getAllQuestionVersionSchema,
   getQuestionVersionByIdSchema,
   deleteQuestionVersionByIdSchema,
};

export type TCreateQuestionVersionPayloadType = z.infer<typeof createQuestionVersionSchema.shape.body>;
export type TUpdateQuestionVersionPayloadType = z.infer<typeof updateQuestionVersionSchema.shape.body>;
export type TGetAllQuestionVersionQueryParamsType = z.infer<typeof getAllQuestionVersionSchema.shape.query>;
export type TGetQuestionVersionByIdParamsType = z.infer<typeof getQuestionVersionByIdSchema.shape.params>;
export type TDeleteQuestionVersionByIdParamsType = z.infer<typeof deleteQuestionVersionByIdSchema.shape.params>;

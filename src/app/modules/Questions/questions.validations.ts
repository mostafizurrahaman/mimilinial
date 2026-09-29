import z from "zod";
import {
   requiredString,
   optionalNumber,
   optionalEnumString,
   optionalString,
   optionalDate,
} from "../../utils";
import { questionsSortableFields } from "./questions.constants";
import { sortOrderValues } from "../../constants";

// 1. CREATE QUESTIONS
const createQuestionsSchema = z.object({
   body: z.object({}),
});

// 2. UPDATE QUESTIONS
const updateQuestionsSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
   body: z.object({}),
});

// 3. GET ALL QUESTIONS
const getAllQuestionsSchema = z.object({
   query: z.object({
      page: optionalNumber("Page"),
      limit: optionalNumber("Limit"),
      searchTerm: optionalString("Search term"),
      sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
      sortBy: optionalEnumString(questionsSortableFields, "Sort by"),
      fromDate: optionalDate("From date"),
      toDate: optionalDate("To date"),
   }),
});

// 4. GET QUESTIONS BY ID
const getQuestionsByIdSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
});

// 5. DELETE QUESTIONS BY ID
const deleteQuestionsByIdSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
});

export const questionsValidations = {
   createQuestionsSchema,
   updateQuestionsSchema,
   getAllQuestionsSchema,
   getQuestionsByIdSchema,
   deleteQuestionsByIdSchema,
};

export type TCreateQuestionsPayloadType = z.infer<typeof createQuestionsSchema.shape.body>;
export type TUpdateQuestionsPayloadType = z.infer<typeof updateQuestionsSchema.shape.body>;
export type TGetAllQuestionsQueryParamsType = z.infer<typeof getAllQuestionsSchema.shape.query>;
export type TGetQuestionsByIdParamsType = z.infer<typeof getQuestionsByIdSchema.shape.params>;
export type TDeleteQuestionsByIdParamsType = z.infer<typeof deleteQuestionsByIdSchema.shape.params>;

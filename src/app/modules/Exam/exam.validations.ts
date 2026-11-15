import z from "zod";
import {
   requiredString,
   optionalNumber,
   optionalEnumString,
   optionalString,
   optionalDate,
} from "../../utils";
import { examSortableFields } from "./exam.constants";
import { sortOrderValues } from "../../constants";

// 1. CREATE EXAM
const createExamSchema = z.object({
   body: z.object({}),
});

// 2. UPDATE EXAM
const updateExamSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
   body: z.object({}),
});

// 3. GET ALL EXAM
const getAllExamSchema = z.object({
   query: z.object({
      page: optionalNumber("Page"),
      limit: optionalNumber("Limit"),
      searchTerm: optionalString("Search term"),
      sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
      sortBy: optionalEnumString(examSortableFields, "Sort by"),
      fromDate: optionalDate("From date"),
      toDate: optionalDate("To date"),
   }),
});

// 4. GET EXAM BY ID
const getExamByIdSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
});

// 5. DELETE EXAM BY ID
const deleteExamByIdSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
});

export const examValidations = {
   createExamSchema,
   updateExamSchema,
   getAllExamSchema,
   getExamByIdSchema,
   deleteExamByIdSchema,
};

export type TCreateExamPayloadType = z.infer<typeof createExamSchema.shape.body>;
export type TUpdateExamPayloadType = z.infer<typeof updateExamSchema.shape.body>;
export type TGetAllExamQueryParamsType = z.infer<typeof getAllExamSchema.shape.query>;
export type TGetExamByIdParamsType = z.infer<typeof getExamByIdSchema.shape.params>;
export type TDeleteExamByIdParamsType = z.infer<typeof deleteExamByIdSchema.shape.params>;

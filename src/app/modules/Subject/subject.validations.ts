import z from "zod";
import {
   requiredString,
   optionalNumber,
   optionalEnumString,
   optionalString,
   optionalDate,
} from "../../utils";
import { subjectSortableFields } from "./subject.constants";
import { sortOrderValues } from "../../constants";

// 1. CREATE SUBJECT
const createSubjectSchema = z.object({
   body: z.object({}),
});

// 2. UPDATE SUBJECT
const updateSubjectSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
   body: z.object({}),
});

// 3. GET ALL SUBJECT
const getAllSubjectSchema = z.object({
   query: z.object({
      page: optionalNumber("Page"),
      limit: optionalNumber("Limit"),
      searchTerm: optionalString("Search term"),
      sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
      sortBy: optionalEnumString(subjectSortableFields, "Sort by"),
      fromDate: optionalDate("From date"),
      toDate: optionalDate("To date"),
   }),
});

// 4. GET SUBJECT BY ID
const getSubjectByIdSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
});

// 5. DELETE SUBJECT BY ID
const deleteSubjectByIdSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
});

export const subjectValidations = {
   createSubjectSchema,
   updateSubjectSchema,
   getAllSubjectSchema,
   getSubjectByIdSchema,
   deleteSubjectByIdSchema,
};

export type TCreateSubjectPayloadType = z.infer<typeof createSubjectSchema.shape.body>;
export type TUpdateSubjectPayloadType = z.infer<typeof updateSubjectSchema.shape.body>;
export type TGetAllSubjectQueryParamsType = z.infer<typeof getAllSubjectSchema.shape.query>;
export type TGetSubjectByIdParamsType = z.infer<typeof getSubjectByIdSchema.shape.params>;
export type TDeleteSubjectByIdParamsType = z.infer<typeof deleteSubjectByIdSchema.shape.params>;

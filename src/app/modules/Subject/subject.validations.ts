import z from "zod";
import {
   requiredString,
   optionalNumber,
   optionalEnumString,
   optionalString,
   optionalDate,
   positiveNumber,
   requiredStrBoolean,
   requiredMongooseId,
} from "../../utils";
import {
   subjectProjectTypes,
   subjectSortableFields,
} from "./subject.constants";
import { sortOrderValues } from "../../constants";

// 1. CREATE SUBJECT
const createSubjectSchema = z.object({
   body: z.object({
      name_bn: requiredString("Name in Bengali"),
      name_en: requiredString("Name in english"),
      code: requiredString("Subject Code").regex(
         /^[A-Z]{2,5}-[0-9]{3}$/,
         "Subject code must contain 2–5 uppercase letters, followed by a hyphen and 3 digits (e.g., ENG-101).",
      ),
      description: optionalString("description").nullish(),
      colorCode: requiredString("Color code").regex(/^#[0-9A-Fa-f]{6}$/, {
         error: "Invalid color code.",
      }),
      sortOrder: positiveNumber("sort Order").min(1, {
         error: "Sort Order should be positive number.",
      }),
      isFeatured: requiredStrBoolean("Is Featured").default(false),
      isActive: requiredStrBoolean("is Active").default(true),
      metaTitle: requiredString("Meta title")
         .max(60, {
            error: "Meta title must not exceed 60 characters.",
         })
         .optional()
         .nullish(),

      metaDescription: requiredString("Meta description")
         .max(160, {
            error: "Meta description must not exceed 160 characters.",
         })
         .optional()
         .nullish(),
   }),
});

// 2. UPDATE SUBJECT
const updateSubjectSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
   body: z.object({
      name_bn: optionalString("Name in Bengali"),
      name_en: optionalString("Name in english"),
      code: requiredString("Subject Code")
         .regex(
            /^[A-Z]{2,5}-[0-9]{3}$/,
            "Subject code must contain 2–5 uppercase letters, followed by a hyphen and 3 digits (e.g., ENG-101).",
         )
         .optional(),
      description: optionalString("description").nullish(),
      colorCode: requiredString("Color code")
         .regex(/^#[0-9A-Fa-f]{6}$/, {
            error: "Invalid color code.",
         })
         .optional(),
      sortOrder: positiveNumber("sort Order")
         .min(1, {
            error: "Sort Order should be positive number.",
         })
         .optional(),
      isFeatured: requiredStrBoolean("Is Featured").optional(),
      isActive: requiredStrBoolean("is Active").optional(),
      metaTitle: requiredString("Meta title")
         .max(60, {
            error: "Meta title must not exceed 60 characters.",
         })
         .optional()
         .nullish(),

      metaDescription: requiredString("Meta description")
         .max(160, {
            error: "Meta description must not exceed 160 characters.",
         })
         .optional()
         .nullish(),
   }),
});

// 3. GET ALL SUBJECT
const getAllSubjectSchema = z.object({
   query: z.object({
      page: optionalNumber("Page"),
      limit: optionalNumber("Limit"),
      searchTerm: optionalString("Search term"),
      sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
      sortBy: optionalEnumString(subjectSortableFields, "Sort by"),
      isFeatured: requiredStrBoolean("Is featured").optional(),
      isActive: requiredStrBoolean("Is active").optional(),
      fromDate: optionalDate("From date"),
      toDate: optionalDate("To date"),
      projectType: optionalEnumString(subjectProjectTypes, "projectType"),
   }),
});

// 3.1 GET ALL Active SUBJECT
const getAllActiveSubjectSchema = z.object({
   query: z.object({
      page: optionalNumber("Page"),
      limit: optionalNumber("Limit"),
      searchTerm: optionalString("Search term"),
      sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
      sortBy: optionalEnumString(subjectSortableFields, "Sort by"),
      isFeatured: requiredStrBoolean("Is featured").optional(),
      fromDate: optionalDate("From date"),
      toDate: optionalDate("To date"),
      projectType: optionalEnumString(subjectProjectTypes, "projectType"),
   }),
});

// 4. GET SUBJECT BY ID
const getSubjectByIdSchema = z.object({
   params: z.object({
      id: requiredMongooseId("ID"),
   }),
});

// 4. GET SUBJECT BY Slug
const getSubjectBySlugSchema = z.object({
   params: z.object({
      slug: requiredString("Slug"),
   }),
});

// 5. DELETE SUBJECT BY ID
const deleteSubjectByIdSchema = z.object({
   params: z.object({
      id: requiredMongooseId("ID"),
   }),
});

export const subjectValidations = {
   createSubjectSchema,
   updateSubjectSchema,
   getAllSubjectSchema,
   getSubjectByIdSchema,
   deleteSubjectByIdSchema,
   getSubjectBySlugSchema,
   getAllActiveSubjectSchema,
};

export type TCreateSubjectPayloadType = z.infer<
   typeof createSubjectSchema.shape.body
>;
export type TUpdateSubjectPayloadType = z.infer<
   typeof updateSubjectSchema.shape.body
>;
export type TGetAllSubjectQueryParamsType = z.infer<
   typeof getAllSubjectSchema.shape.query
>;
export type TGetAllActiveSubjectQueryParamsType = z.infer<
   typeof getAllActiveSubjectSchema.shape.query
>;
export type TGetSubjectByIdParamsType = z.infer<
   typeof getSubjectByIdSchema.shape.params
>;
export type TDeleteSubjectByIdParamsType = z.infer<
   typeof deleteSubjectByIdSchema.shape.params
>;

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
   enumString,
} from "../../utils";
import {
   SUBJECT_VALUES,
   subjectProjectTypes,
   subjectSortableFields,
} from "./subject.constants";
import { sortOrderValues } from "../../constants";

// 1. CREATE SUBJECT
const createSubjectSchema = z.object({
   body: z.object({
      nameBn: requiredString("Name in Bengali"),
      nameEn: requiredString("Name in english"),
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
      status: enumString(SUBJECT_VALUES, "Status").optional(),
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
      id: requiredMongooseId("Subject ID"),
   }),
   body: z.object({
      nameBn: optionalString("Name in Bengali"),
      nameEn: optionalString("Name in english"),
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
      status: optionalEnumString(SUBJECT_VALUES, "Status").optional(),
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
      status: optionalEnumString(SUBJECT_VALUES, "Status").optional(),
      fromDate: optionalDate("From date"),
      toDate: optionalDate("To date"),
      projection: optionalEnumString(subjectProjectTypes, "projection"),
   }),
});

// 3.1 GET ALL Published SUBJECT
const getAllPublishedSubjectSchema = z.object({
   query: z.object({
      page: optionalNumber("Page"),
      limit: optionalNumber("Limit"),
      searchTerm: optionalString("Search term"),
      sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
      sortBy: optionalEnumString(subjectSortableFields, "Sort by"),
      isFeatured: requiredStrBoolean("Is featured").optional(),
      fromDate: optionalDate("From date"),
      toDate: optionalDate("To date"),
      projection: optionalEnumString(subjectProjectTypes, "projection"),
   }),
});

// 4. GET SUBJECT BY ID
const getSubjectByIdSchema = z.object({
   params: z.object({
      id: requiredMongooseId("Subject ID"),
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
      id: requiredMongooseId("Subject ID"),
   }),
});

// 6. Mark as Published
const markSubjectAsPublishedSchema = z.object({
   params: z.object({
      id: requiredMongooseId("Subject ID"),
   }),
});

// 7. Mark as Archived
const markSubjectAsArchivedSchema = z.object({
   params: z.object({
      id: requiredMongooseId("Subject ID"),
   }),
});

export const subjectValidations = {
   createSubjectSchema,
   updateSubjectSchema,
   getAllSubjectSchema,
   getSubjectByIdSchema,
   deleteSubjectByIdSchema,
   getSubjectBySlugSchema,
   getAllPublishedSubjectSchema,
   markSubjectAsPublishedSchema,
   markSubjectAsArchivedSchema,
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
export type TGetAllPublishedSubjectQueryParamsType = z.infer<
   typeof getAllPublishedSubjectSchema.shape.query
>;
export type TGetSubjectByIdParamsType = z.infer<
   typeof getSubjectByIdSchema.shape.params
>;
export type TDeleteSubjectByIdParamsType = z.infer<
   typeof deleteSubjectByIdSchema.shape.params
>;

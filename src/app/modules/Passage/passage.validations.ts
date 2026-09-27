import z from "zod";
import {
   requiredString,
   optionalNumber,
   optionalEnumString,
   optionalString,
   optionalDate,
} from "../../utils";
import {
   PASSAGE_STATUS_VALUES,
   passageSortableFields,
} from "./passage.constants";
import { sortOrderValues } from "../../constants";
import { seoSchema } from "../Collection";

// 1. CREATE PASSAGE
const createPassageSchema = z.object({
   body: z
      .object({
         titleEn: requiredString("English title").max(500, {
            error: "Max title should be 500.",
         }),
         titleBn: requiredString("Bangla title").max(500, {
            error: "Max title should be 500.",
         }),
         bodyEn: requiredString("Body in English").max(5000, {
            error: "Body in english is required.",
         }),
         bodyBn: requiredString("Body in Bangla").max(5000, {
            error: "Body in bangla is required.",
         }),
         metaTitle: optionalString("Meta title"),
         metaDescription: optionalString("Meta description"),
      })
      .extend(seoSchema),
});

// 2. UPDATE PASSAGE
const updatePassageSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
   body: z
      .object({
         titleEn: requiredString("English title")
            .max(500, {
               error: "Max title should be 500.",
            })
            .optional(),
         titleBn: requiredString("Bangla title")
            .max(500, {
               error: "Max title should be 500.",
            })
            .optional(),
         bodyEn: requiredString("Body in English")
            .max(5000, {
               error: "Body in english is required.",
            })
            .optional(),
         bodyBn: requiredString("Body in Bangla")
            .max(5000, {
               error: "Body in bangla is required.",
            })
            .optional(),
      })
      .extend(seoSchema),
});

// 3. GET ALL PASSAGE
const getAllPassageSchema = z.object({
   query: z.object({
      page: optionalNumber("Page"),
      limit: optionalNumber("Limit"),
      searchTerm: optionalString("Search term"),
      sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
      sortBy: optionalEnumString(passageSortableFields, "Sort by"),
      status: optionalEnumString(PASSAGE_STATUS_VALUES, "Status"),
      fromDate: optionalDate("From date"),
      toDate: optionalDate("To date"),
   }),
});

// 4. GET PASSAGE BY ID
const getPassageByIdSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
});

// 5. DELETE PASSAGE BY ID
const deletePassageByIdSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
});

export const passageValidations = {
   createPassageSchema,
   updatePassageSchema,
   getAllPassageSchema,
   getPassageByIdSchema,
   deletePassageByIdSchema,
};

export type TCreatePassagePayloadType = z.infer<
   typeof createPassageSchema.shape.body
>;
export type TUpdatePassagePayloadType = z.infer<
   typeof updatePassageSchema.shape.body
>;
export type TGetAllPassageQueryParamsType = z.infer<
   typeof getAllPassageSchema.shape.query
>;
export type TGetPassageByIdParamsType = z.infer<
   typeof getPassageByIdSchema.shape.params
>;
export type TDeletePassageByIdParamsType = z.infer<
   typeof deletePassageByIdSchema.shape.params
>;

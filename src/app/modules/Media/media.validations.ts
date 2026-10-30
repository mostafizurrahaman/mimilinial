import z from "zod";
import {
   requiredString,
   optionalNumber,
   optionalEnumString,
   optionalString,
   optionalDate,
} from "../../utils";
import { mediaSortableFields } from "./media.constants";
import { sortOrderValues } from "../../constants";

// 1. CREATE MEDIA
const createMediaSchema = z.object({
   body: z.object({
      
   }),
});

// 2. UPDATE MEDIA
const updateMediaSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
   body: z.object({}),
});

// 3. GET ALL MEDIA
const getAllMediaSchema = z.object({
   query: z.object({
      page: optionalNumber("Page"),
      limit: optionalNumber("Limit"),
      searchTerm: optionalString("Search term"),
      sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
      sortBy: optionalEnumString(mediaSortableFields, "Sort by"),
      fromDate: optionalDate("From date"),
      toDate: optionalDate("To date"),
   }),
});

// 4. GET MEDIA BY ID
const getMediaByIdSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
});

// 5. DELETE MEDIA BY ID
const deleteMediaByIdSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
});

export const mediaValidations = {
   createMediaSchema,
   updateMediaSchema,
   getAllMediaSchema,
   getMediaByIdSchema,
   deleteMediaByIdSchema,
};

export type TCreateMediaPayloadType = z.infer<typeof createMediaSchema.shape.body>;
export type TUpdateMediaPayloadType = z.infer<typeof updateMediaSchema.shape.body>;
export type TGetAllMediaQueryParamsType = z.infer<typeof getAllMediaSchema.shape.query>;
export type TGetMediaByIdParamsType = z.infer<typeof getMediaByIdSchema.shape.params>;
export type TDeleteMediaByIdParamsType = z.infer<typeof deleteMediaByIdSchema.shape.params>;

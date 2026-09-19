import z from "zod";
import {
   requiredString,
   optionalNumber,
   optionalEnumString,
   optionalString,
   optionalDate,
   requiredMongooseId,
   requiredStrBoolean,
} from "../../utils";
import { trackSortableFields } from "./track.constants";
import { sortOrderValues } from "../../constants";

// 1. CREATE TRACK
const createTrackSchema = z.object({
   body: z.object({
      category: requiredMongooseId("Category ID"),
      name: requiredString("Name"),
      description: optionalString("Description").nullish(),
      isActive: requiredStrBoolean("Is Active").default(true),
   }),
});

// 2. UPDATE TRACK
const updateTrackSchema = z.object({
   params: z.object({
      id: requiredMongooseId("Track ID"),
   }),
   body: z.object({
      category: requiredMongooseId("Category ID"),
      name: requiredString("Name"),

      description: optionalString("Description").nullish(),
      isActive: requiredStrBoolean("Is Active").default(true),
   }),
});

// 3. GET ALL TRACK
const getAllTrackSchema = z.object({
   query: z.object({
      page: optionalNumber("Page"),
      limit: optionalNumber("Limit"),
      searchTerm: optionalString("Search term"),
      category: requiredMongooseId("Category ID").optional(),
      isActive: requiredStrBoolean("Is Active").optional(),
      isCategoryActive: requiredStrBoolean("Is Category").optional(),
      sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
      sortBy: optionalEnumString(trackSortableFields, "Sort by"),
      fromDate: optionalDate("From date"),
      toDate: optionalDate("To date"),
   }),
});

// 3.1. GET ALL TRACK
const getAllActiveTrackSchema = z.object({
   query: z.object({
      page: optionalNumber("Page"),
      limit: optionalNumber("Limit"),
      searchTerm: optionalString("Search term"),
      category: requiredMongooseId("Category ID").optional(),
      sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
      sortBy: optionalEnumString(trackSortableFields, "Sort by"),
      fromDate: optionalDate("From date"),
      toDate: optionalDate("To date"),
   }),
});

// 4. GET TRACK BY ID
const getTrackByIdSchema = z.object({
   params: z.object({
      id: requiredMongooseId("ID"),
   }),
});

// 5. DELETE TRACK BY ID
const deleteTrackByIdSchema = z.object({
   params: z.object({
      id: requiredMongooseId("ID"),
   }),
});

export const trackValidations = {
   createTrackSchema,
   updateTrackSchema,
   getAllTrackSchema,
   getTrackByIdSchema,
   deleteTrackByIdSchema,
};

export type TCreateTrackPayloadType = z.infer<
   typeof createTrackSchema.shape.body
>;
export type TUpdateTrackPayloadType = z.infer<
   typeof updateTrackSchema.shape.body
>;
export type TGetAllTrackQueryParamsType = z.infer<
   typeof getAllTrackSchema.shape.query
>;
export type TGetAllActiveTrackQueryParamsType = z.infer<
   typeof getAllActiveTrackSchema.shape.query
>;
export type TGetTrackByIdParamsType = z.infer<
   typeof getTrackByIdSchema.shape.params
>;
export type TDeleteTrackByIdParamsType = z.infer<
   typeof deleteTrackByIdSchema.shape.params
>;

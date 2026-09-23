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
import {
  trackProjectTypes,
  trackSortableFields,
  trackStatusValues,
} from "./track.constants";
import { sortOrderValues } from "../../constants";
import { COLLECTION_STATUS_VALUES, seoSchema } from "../Collection";
import { categoryStatusValues } from "../Category";

// 1. CREATE TRACK
const createTrackSchema = z.object({
  body: z
    .object({
      category: requiredMongooseId("Category ID"),
      nameBn: requiredString("Name in Bangla"),
      nameEn: requiredString("Name in English"),
      description: optionalString("Description").nullish(),
    })
    .extend(seoSchema.shape),
});

// 2. UPDATE TRACK
const updateTrackSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Track ID"),
  }),
  body: z
    .object({
      category: requiredMongooseId("Category ID").optional(),
      nameBn: optionalString("Name in Bangla"),
      nameEn: optionalString("Name in English"),
      description: optionalString("Description").nullish(),
    })
    .extend(seoSchema.shape),
});

// 3. GET ALL TRACK
const getAllTrackSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    searchTerm: optionalString("Search term"),
    category: requiredMongooseId("Category ID").optional(),
    status: optionalEnumString(trackStatusValues, "Track status"),
    categoryStatus: optionalEnumString(categoryStatusValues, "Category Status"),
    collectionStatus: optionalEnumString(
      COLLECTION_STATUS_VALUES,
      "Collection status",
    ),
    sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
    sortBy: optionalEnumString(trackSortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date"),
    projection: optionalEnumString(trackProjectTypes, "Projection"),
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
    projection: optionalEnumString(trackProjectTypes, "Projection"),
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

import z from "zod";
import {
   requiredString,
   optionalNumber,
   optionalEnumString,
   optionalString,
   optionalDate,
   requiredStrBoolean,
   requiredMongooseId,
   enumString,
} from "../../utils";
import {
   COLLECTION_STATUS_VALUES,
   collectionProjectTypes,
   collectionSortableFields,
} from "./collection.constants";
import { sortOrderValues } from "../../constants";

export const seoSchema = z.object({
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
});

// 1. CREATE COLLECTION
const createCollectionSchema = z.object({
   body: z
      .object({
         nameBn: requiredString("Name in Bangla"),
         nameEn: requiredString("Name in English"),
         description: optionalString("Description").nullish(),
      })
      .extend(seoSchema.shape),
});

// 2. UPDATE COLLECTION
const updateCollectionSchema = z.object({
   params: z.object({
      id: requiredMongooseId("Collection ID"),
   }),
   body: z
      .object({
         nameBn: optionalString("Name in Bangla"),
         nameEn: optionalString("Name in English"),
         description: optionalString("Description").nullish(),
      })
      .extend(seoSchema.shape),
});

// 3. GET ALL COLLECTION
const getAllCollectionSchema = z.object({
   query: z.object({
      page: optionalNumber("Page"),
      limit: optionalNumber("Limit"),
      searchTerm: optionalString("Search term"),
      sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
      status: optionalEnumString(COLLECTION_STATUS_VALUES, "Status"),
      sortBy: optionalEnumString(collectionSortableFields, "Sort by"),
      fromDate: optionalDate("From date"),
      toDate: optionalDate("To date"),
      projection: optionalEnumString(
         collectionProjectTypes,
         "Projection",
      ).default("details"),
   }),
});

// 3.1. GET ALL COLLECTION
const getAllPublishedCollectionSchema = z.object({
   query: z.object({
      page: optionalNumber("Page"),
      limit: optionalNumber("Limit"),
      searchTerm: optionalString("Search term"),
      sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
      sortBy: optionalEnumString(collectionSortableFields, "Sort by"),
      fromDate: optionalDate("From date"),
      toDate: optionalDate("To date"),
      projection: optionalEnumString(
         collectionProjectTypes,
         "Projection",
      ).default("details"),
   }),
});

// 4. GET COLLECTION BY ID
const getCollectionByIdSchema = z.object({
   params: z.object({
      id: requiredMongooseId("Collection ID"),
   }),
});

// 5. DELETE COLLECTION BY ID
const deleteCollectionByIdSchema = z.object({
   params: z.object({
      id: requiredMongooseId("Collection ID"),
   }),
});

// 6. Mark as published:
const markCollectionAsPublishedSchema = z.object({
   params: z.object({
      id: requiredMongooseId("Collection ID"),
   }),
});

// 7. Mark as Archived:
const markCollectionAsArchivedSchema = z.object({
   params: z.object({
      id: requiredMongooseId("Collection ID"),
   }),
});

export const collectionValidations = {
   createCollectionSchema,
   updateCollectionSchema,
   getAllCollectionSchema,
   getCollectionByIdSchema,
   deleteCollectionByIdSchema,
   getAllPublishedCollectionSchema,
   markCollectionAsPublishedSchema,
   markCollectionAsArchivedSchema,
};

export type TCreateCollectionPayloadType = z.infer<
   typeof createCollectionSchema.shape.body
>;
export type TUpdateCollectionPayloadType = z.infer<
   typeof updateCollectionSchema.shape.body
>;
export type TGetAllCollectionQueryParamsType = z.infer<
   typeof getAllCollectionSchema.shape.query
>;
export type TGetCollectionByIdParamsType = z.infer<
   typeof getCollectionByIdSchema.shape.params
>;
export type TDeleteCollectionByIdParamsType = z.infer<
   typeof deleteCollectionByIdSchema.shape.params
>;

export type TGetAllPublishedCollectionQueryParamsType = z.infer<
   typeof getAllPublishedCollectionSchema.shape.query
>;

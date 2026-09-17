import z from "zod";
import {
   requiredString,
   optionalNumber,
   optionalEnumString,
   optionalString,
   optionalDate,
} from "../../utils";
import { collectionSortableFields } from "./collection.constants";
import { sortOrderValues } from "../../constants";

// 1. CREATE COLLECTION
const createCollectionSchema = z.object({
   body: z.object({
      name: requiredString("Name"),
   }),
});

// 2. UPDATE COLLECTION
const updateCollectionSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
   body: z.object({}),
});

// 3. GET ALL COLLECTION
const getAllCollectionSchema = z.object({
   query: z.object({
      page: optionalNumber("Page"),
      limit: optionalNumber("Limit"),
      searchTerm: optionalString("Search term"),
      sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
      sortBy: optionalEnumString(collectionSortableFields, "Sort by"),
      fromDate: optionalDate("From date"),
      toDate: optionalDate("To date"),
   }),
});

// 4. GET COLLECTION BY ID
const getCollectionByIdSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
});

// 5. DELETE COLLECTION BY ID
const deleteCollectionByIdSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
});

export const collectionValidations = {
   createCollectionSchema,
   updateCollectionSchema,
   getAllCollectionSchema,
   getCollectionByIdSchema,
   deleteCollectionByIdSchema,
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

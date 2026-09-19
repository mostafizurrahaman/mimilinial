import z, { optional } from "zod";
import {
   requiredString,
   optionalNumber,
   optionalEnumString,
   optionalString,
   optionalDate,
   requiredMongooseId,
   requiredStrBoolean,
} from "../../utils";
import { categorySortableFields } from "./category.constants";
import { sortOrderValues } from "../../constants";

// 1. CREATE CATEGORY
const createCategorySchema = z.object({
   body: z.object({
      collectionId: requiredMongooseId("Collection ID"),
      name: requiredString("Category name"),
      description: optionalString("Category description").nullish(),
      isActive: requiredStrBoolean("isActive").default(true),
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

// 2. UPDATE CATEGORY
const updateCategorySchema = z.object({
   params: z.object({
      id: requiredMongooseId("Collection ID"),
   }),
   body: z.object({
      collectionId: requiredMongooseId("Collection ID"),
      name: requiredString("Category name"),
      description: optionalString("Category description").nullish(),
      isActive: requiredStrBoolean("isActive").default(true),
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

// 3. GET ALL CATEGORY
const getAllCategorySchema = z.object({
   query: z.object({
      page: optionalNumber("Page"),
      limit: optionalNumber("Limit"),
      collectionId: requiredMongooseId("Collection ID").optional(),
      isActive: requiredStrBoolean("isActive").optional(),
      isCollectionActive: requiredStrBoolean("isActive").optional(),
      searchTerm: optionalString("Search term"),
      sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
      sortBy: optionalEnumString(categorySortableFields, "Sort by"),
      fromDate: optionalDate("From date"),
      toDate: optionalDate("To date"),
   }),
});

const getAllActiveCategorySchema = z.object({
   query: getAllCategorySchema.shape.query.omit({
      isActive: true,
      isCollectionActive: true,
   }),
});

// 4. GET CATEGORY BY ID
const getCategoryByIdSchema = z.object({
   params: z.object({
      id: requiredMongooseId("Collection ID"),
   }),
});

// 5. DELETE CATEGORY BY ID
const deleteCategoryByIdSchema = z.object({
   params: z.object({
      id: requiredMongooseId("Collection ID"),
   }),
});

export const categoryValidations = {
   createCategorySchema,
   updateCategorySchema,
   getAllCategorySchema,
   getCategoryByIdSchema,
   deleteCategoryByIdSchema,
   getAllActiveCategorySchema,
};

export type TCreateCategoryPayloadType = z.infer<
   typeof createCategorySchema.shape.body
>;
export type TUpdateCategoryPayloadType = z.infer<
   typeof updateCategorySchema.shape.body
>;
export type TGetAllCategoryQueryParamsType = z.infer<
   typeof getAllCategorySchema.shape.query
>;
export type TGetAllActiveCategoryQueryParamsType = z.infer<
   typeof getAllActiveCategorySchema.shape.query
>;
export type TGetCategoryByIdParamsType = z.infer<
   typeof getCategoryByIdSchema.shape.params
>;
export type TDeleteCategoryByIdParamsType = z.infer<
   typeof deleteCategoryByIdSchema.shape.params
>;

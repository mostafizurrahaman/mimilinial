import z, { optional } from "zod";
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  requiredMongooseId,
} from "../../utils";
import {
  categoryProjectionValues,
  categorySortableFields,
  categoryStatusValues,
} from "./category.constants";
import { sortOrderValues } from "../../constants";
import { COLLECTION_STATUS_VALUES, seoSchema } from "../Collection";

// 1. CREATE CATEGORY
const createCategorySchema = z.object({
  body: z
    .object({
      collectionId: requiredMongooseId("Collection ID"),
      nameBn: requiredString("Category name in Bangla"),
      nameEn: requiredString("Category name in English"),
      description: optionalString("Category description").nullish(),
    })
    .extend(seoSchema.shape),
});

// 2. UPDATE CATEGORY
const updateCategorySchema = z.object({
  params: z.object({
    id: requiredMongooseId("Category ID"),
  }),
  body: z
    .object({
      collectionId: requiredMongooseId("Collection ID").optional(),
      nameBn: optionalString("Category name in Bangla"),
      nameEn: requiredString("Category name in English"),
      description: optionalString("Category description").nullish(),
    })
    .extend(seoSchema.shape),
});

// 3. GET ALL CATEGORY
const getAllCategorySchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    collectionId: requiredMongooseId("Collection ID").optional(),
    status: optionalEnumString(categoryStatusValues, "Status"),
    collectionStatus: optionalEnumString(
      COLLECTION_STATUS_VALUES,
      "Collection Status",
    ),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
    sortBy: optionalEnumString(categorySortableFields, "Sort by"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date"),
    projection: optionalEnumString(categoryProjectionValues, "Projection"),
  }),
});

const getAllPublishedCategorySchema = z.object({
  query: getAllCategorySchema.shape.query.omit({
    status: true,
    collectionStatus: true,
  }),
});

// 4. GET CATEGORY BY ID
const getCategoryByIdSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Category ID"),
  }),
});

// 5. DELETE CATEGORY BY ID
const deleteCategoryByIdSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Category ID"),
  }),
});

// 6. Mark as published:
const markCategoryAsPublishedSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Category ID"),
  }),
});

// 6. Mark as Archived:
const markCategoryAsArchivedSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Category ID"),
  }),
});

export const categoryValidations = {
  createCategorySchema,
  updateCategorySchema,
  getAllCategorySchema,
  getCategoryByIdSchema,
  deleteCategoryByIdSchema,
  getAllPublishedCategorySchema,
  markCategoryAsPublishedSchema,
  markCategoryAsArchivedSchema,
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
export type TGetAllPublishedCategoryQueryParamsType = z.infer<
  typeof getAllPublishedCategorySchema.shape.query
>;
export type TGetCategoryByIdParamsType = z.infer<
  typeof getCategoryByIdSchema.shape.params
>;
export type TDeleteCategoryByIdParamsType = z.infer<
  typeof deleteCategoryByIdSchema.shape.params
>;

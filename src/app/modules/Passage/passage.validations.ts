import z from "zod";
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
} from "../../utils";
import {
  PASSAGE_PROJECTION_TYPE,
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
        error: "English title must not exceed 500 characters.",
      }),

      titleBn: requiredString("Bangla title").max(500, {
        error: "Bangla title must not exceed 500 characters.",
      }),

      bodyEn: requiredString("Body in English").max(5000, {
        error: "Body in English must not exceed 5000 characters.",
      }),

      bodyBn: requiredString("Body in Bangla").max(5000, {
        error: "Body in Bangla must not exceed 5000 characters.",
      }),

      metaTitle: optionalString("Meta title"),

      metaDescription: optionalString("Meta description"),
    })
    .extend(seoSchema.shape),
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
          error: "English title must not exceed 500 characters.",
        })
        .optional(),

      titleBn: requiredString("Bangla title")
        .max(500, {
          error: "Bangla title must not exceed 500 characters.",
        })
        .optional(),

      bodyEn: requiredString("Body in English")
        .max(5000, {
          error: "Body in English must not exceed 5000 characters.",
        })
        .optional(),

      bodyBn: requiredString("Body in Bangla")
        .max(5000, {
          error: "Body in Bangla must not exceed 5000 characters.",
        })
        .optional(),
    })
    .extend(seoSchema.shape),
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
    slug: optionalString("Slug"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date"),
    projection: optionalEnumString(PASSAGE_PROJECTION_TYPE, "Projection"),
  }),
});

// 3.1. GET ALL PASSAGE
const getPublishedActivePassageSchema = z.object({
  query: getAllPassageSchema.shape.query.omit({
    status: true,
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

// 6. Publish PASSAGE BY ID
const markAsPublishedSchema = z.object({
  params: z.object({
    id: requiredString("ID"),
  }),
});

// 6. Archive PASSAGE BY ID
const markAsArchivedSchema = z.object({
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
  markAsPublishedSchema,
  markAsArchivedSchema,
  getPublishedActivePassageSchema,
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
export type TGetAllPublishedQueryParamsType = z.infer<
  typeof getPublishedActivePassageSchema.shape.query
>;
export type TGetPassageByIdParamsType = z.infer<
  typeof getPassageByIdSchema.shape.params
>;
export type TDeletePassageByIdParamsType = z.infer<
  typeof deletePassageByIdSchema.shape.params
>;

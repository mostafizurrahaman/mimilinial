import z, { optional } from "zod";
import {
  requiredString,
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  requiredMongooseId,
  requiredNumber,
  enumString,
} from "../../utils";
import { TOPIC_VALUES, topicSortableFields } from "./topic.constants";
import { sortOrderValues } from "../../constants";

// 1. CREATE TOPIC
const createTopicSchema = z.object({
  body: z.object({
    subject: requiredMongooseId("Subject"),
    parentTopic: requiredMongooseId("Parent topic").optional().nullish(),
    nameBn: requiredString("Name in Bangla"),
    nameEn: requiredString("Name in English"),
    descriptionBn: optionalString("Description in Bangla"),
    descriptionEn: optionalString("Description in English"),
    sortOrder: requiredNumber()
      .min(1, {
        error: "Min. sort order should be 1",
      })
      .optional()
      .default(0),
    metaTitle: optionalString("Meta title").nullish(),
    metaDescription: optionalString("Meta description").nullish(),
  }),
});

// 2. UPDATE TOPIC
const updateTopicSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Topic ID"),
  }),
  body: z.object({
    subject: requiredMongooseId("Subject").optional(),
    parentTopic: requiredMongooseId("Parent topic").optional().nullish(),
    nameBn: optionalString("Name in Bangla"),
    nameEn: optionalString("Name in English"),
    descriptionBn: optionalString("Description in Bangla"),
    descriptionEn: optionalString("Description in English"),
    sortOrder: requiredNumber()
      .min(1, {
        error: "Min. sort order should be 1",
      })
      .optional()
      .default(0),
    status: optionalEnumString(TOPIC_VALUES, "Topic status"),
    metaTitle: optionalString("Meta title").nullish(),
    metaDescription: optionalString("Meta description").nullish(),
  }),
});

// 3. GET ALL TOPIC
const getAllTopicSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    slug: optionalString("Slug").nullish(),
    subjectId: requiredMongooseId("Subject ID").optional(),
    parentTopicId: requiredMongooseId("Parent Topic ID").optional(),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
    sortBy: optionalEnumString(topicSortableFields, "Sort by"),
    status: optionalEnumString(TOPIC_VALUES, "Status"),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date"),
  }),
});

// 3.1 GET ALL PUBLISHED TOPIC
const getAllPublishedTopicSchema = z.object({
  query: z.object({
    page: optionalNumber("Page"),
    limit: optionalNumber("Limit"),
    slug: optionalString("Slug"),
    subjectId: requiredMongooseId("Subject ID").optional(),
    parentTopicId: requiredMongooseId("Parent Topic ID").optional(),
    searchTerm: optionalString("Search term"),
    sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
    sortBy: optionalEnumString(topicSortableFields, "Sort by"),
    status: optionalEnumString(TOPIC_VALUES, "Status").optional(),
    fromDate: optionalDate("From date"),
    toDate: optionalDate("To date"),
  }),
});

// 4. GET TOPIC BY ID
const getTopicByIdSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Topic ID"),
  }),
});

// 5. DELETE TOPIC BY ID
const deleteTopicByIdSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Topic ID"),
  }),
});

// 6. Mark as Published
const markTopicAsPublishedSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Topic ID"),
  }),
});

// 7. Mark as Archived
const markTopicAsArchivedSchema = z.object({
  params: z.object({
    id: requiredMongooseId("Topic ID"),
  }),
});

export const topicValidations = {
  createTopicSchema,
  updateTopicSchema,
  getAllTopicSchema,
  getAllPublishedTopicSchema,
  getTopicByIdSchema,
  deleteTopicByIdSchema,
  markTopicAsPublishedSchema,
  markTopicAsArchivedSchema,
};

export type TCreateTopicPayloadType = z.infer<
  typeof createTopicSchema.shape.body
>;
export type TUpdateTopicPayloadType = z.infer<
  typeof updateTopicSchema.shape.body
>;
export type TGetAllTopicQueryParamsType = z.infer<
  typeof getAllTopicSchema.shape.query
>;
export type TGetTopicByIdParamsType = z.infer<
  typeof getTopicByIdSchema.shape.params
>;
export type TGetAllPublishedTopicQueryParamsType = z.infer<
  typeof getAllPublishedTopicSchema.shape.query
>;

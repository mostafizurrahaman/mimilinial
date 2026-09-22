import httpStatus from "http-status";
import type { PipelineStage } from "mongoose";
import type {
  TCreateTopicPayloadType,
  TUpdateTopicPayloadType,
  TGetAllTopicQueryParamsType,
} from "./topic.validations";
import { AppError } from "../../errors";
import { Topic } from "./topic.model";
import { topicSearchableFields } from "./topic.constants";

// 1. CREATE TOPIC
const createTopic = async (payload: TCreateTopicPayloadType) => {
  const result = await Topic.create(payload);
  return result;
};

// 2. UPDATE TOPIC
const updateTopic = async (id: string, payload: TUpdateTopicPayloadType) => {
  const result = await Topic.findOneAndUpdate(
    { _id: id },
    { $set: payload },
    { new: true },
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Topic not found");
  }

  return result;
};

// 3. GET ALL TOPIC
const getAllTopic = async (query: TGetAllTopicQueryParamsType) => {
  const { page, limit, skip, searchTerm, sortOrder, sortBy, fromDate, toDate } =
    formatQuery(query, topicSortableFields);

  const pipeline: PipelineStage[] = [];

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {};
    if (fromDate) dateFilter.$gte = new Date(fromDate);
    if (toDate) dateFilter.$lte = new Date(toDate);

    pipeline.push({ $match: { createdAt: dateFilter } });
  }

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: topicSearchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: "i" },
        })),
      },
    });
  }

  pipeline.push({ $sort: { [sortBy]: sortOrder } });

  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limit }],
      meta: [{ $count: "total" }],
    },
  });

  const aggregated = await Topic.aggregate(pipeline);

  const data = aggregated?.[0]?.data || [];
  const total = aggregated?.[0]?.meta?.[0]?.total || 0;

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

// 4. GET TOPIC BY ID
const getTopicById = async (id: string) => {
  const result = await Topic.findById(id);

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Topic not found");
  }

  return result;
};

// 5. DELETE TOPIC BY ID
const deleteTopicById = async (id: string) => {
  const result = await Topic.findOneAndDelete({ _id: id });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Topic not found");
  }

  return result;
};

export const topicServices = {
  createTopic,
  updateTopic,
  getAllTopic,
  getTopicById,
  deleteTopicById,
};

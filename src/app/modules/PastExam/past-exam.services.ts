import httpStatus from "http-status";
import type { PipelineStage } from "mongoose";
import type {
  TCreatePastExamPayloadType,
  TUpdatePastExamPayloadType,
  TGetAllPastExamQueryParamsType,
} from "./past-exam.validations";
import { AppError, NotFoundError } from "../../errors";
import { PastExam } from "./past-exam.model";
import { pastExamSearchableFields } from "./past-exam.constants";
import type { IUserDoc } from "../User";
import { Category, categoryStatus } from "../Category";

// 1. CREATE PAST EXAM
const createPastExam = async (
  user: IUserDoc,
  payload: TCreatePastExamPayloadType,
) => {
  const { category, track, nameBn, nameEn, year, description } = payload;

  const existingCategory = await Category.findById(category);

  if (!existingCategory) {
    throw new NotFoundError("Category not found.");
  }

  if (existingCategory.status !== categoryStatus.PUBLISHED) {
    throw new NotFoundError("You.");
  }

  const result = await PastExam.create(payload);
  return result;
};

// 2. UPDATE PAST EXAM
const updatePastExam = async (
  id: string,
  payload: TUpdatePastExamPayloadType,
) => {
  const result = await PastExam.findOneAndUpdate(
    { _id: id },
    { $set: payload },
    { new: true },
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "PastExam not found");
  }

  return result;
};

// 3. GET ALL PAST EXAM
const getAllPastExam = async (query: TGetAllPastExamQueryParamsType) => {
  const { page, limit, skip, searchTerm, sortOrder, sortBy, fromDate, toDate } =
    formatQuery(query, pastExamSortableFields);

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
        $or: pastExamSearchableFields.map((field) => ({
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

  const aggregated = await PastExam.aggregate(pipeline);

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

// 4. GET PAST EXAM BY ID
const getPastExamById = async (id: string) => {
  const result = await PastExam.findById(id);

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "PastExam not found");
  }

  return result;
};

// 5. DELETE PAST EXAM BY ID
const deletePastExamById = async (id: string) => {
  const result = await PastExam.findOneAndDelete({ _id: id });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "PastExam not found");
  }

  return result;
};

export const pastExamServices = {
  createPastExam,
  updatePastExam,
  getAllPastExam,
  getPastExamById,
  deletePastExamById,
};

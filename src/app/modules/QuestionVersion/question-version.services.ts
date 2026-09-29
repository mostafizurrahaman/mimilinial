import httpStatus from "http-status";
import type { PipelineStage } from "mongoose";
import type {
   TCreateQuestionVersionPayloadType,
   TUpdateQuestionVersionPayloadType,
   TGetAllQuestionVersionQueryParamsType,
} from "./question-version.validations";
import { AppError } from "../../errors";
import { QuestionVersion } from "./question-version.model";
import { questionVersionSearchableFields } from "./question-version.constants";

// 1. CREATE QUESTION VERSION
const createQuestionVersion = async (payload: TCreateQuestionVersionPayloadType) => {
   const result = await QuestionVersion.create(payload);
   return result;
};

// 2. UPDATE QUESTION VERSION
const updateQuestionVersion = async (id: string, payload: TUpdateQuestionVersionPayloadType) => {
   const result = await QuestionVersion.findOneAndUpdate(
      { _id: id },
      { $set: payload },
      { new: true },
   );

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "QuestionVersion not found");
   }

   return result;
};

// 3. GET ALL QUESTION VERSION
const getAllQuestionVersion = async (query: TGetAllQuestionVersionQueryParamsType) => {
   const {
      page,
      limit,
      skip,
      searchTerm,
      sortOrder,
      sortBy,
      fromDate,
      toDate,
   } = formatQuery(query, questionVersionSortableFields);

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
            $or: questionVersionSearchableFields.map((field) => ({
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

   const aggregated = await QuestionVersion.aggregate(pipeline);

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

// 4. GET QUESTION VERSION BY ID
const getQuestionVersionById = async (id: string) => {
   const result = await QuestionVersion.findById(id);

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "QuestionVersion not found");
   }

   return result;
};

// 5. DELETE QUESTION VERSION BY ID
const deleteQuestionVersionById = async (id: string) => {
   const result = await QuestionVersion.findOneAndDelete({ _id: id });

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "QuestionVersion not found");
   }

   return result;
};

export const questionVersionServices = {
   createQuestionVersion,
   updateQuestionVersion,
   getAllQuestionVersion,
   getQuestionVersionById,
   deleteQuestionVersionById,
};

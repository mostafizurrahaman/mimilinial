import httpStatus from "http-status";
import type { PipelineStage } from "mongoose";
import type {
   TCreateQuestionMappingPayloadType,
   TUpdateQuestionMappingPayloadType,
   TGetAllQuestionMappingQueryParamsType,
} from "./question-mapping.validations";
import { AppError } from "../../errors";
import { QuestionMapping } from "./question-mapping.model";
import { questionMappingSearchableFields } from "./question-mapping.constants";

// 1. CREATE QUESTION MAPPING
const createQuestionMapping = async (payload: TCreateQuestionMappingPayloadType) => {
   const result = await QuestionMapping.create(payload);
   return result;
};

// 2. UPDATE QUESTION MAPPING
const updateQuestionMapping = async (id: string, payload: TUpdateQuestionMappingPayloadType) => {
   const result = await QuestionMapping.findOneAndUpdate(
      { _id: id },
      { $set: payload },
      { new: true },
   );

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "QuestionMapping not found");
   }

   return result;
};

// 3. GET ALL QUESTION MAPPING
const getAllQuestionMapping = async (query: TGetAllQuestionMappingQueryParamsType) => {
   const {
      page,
      limit,
      skip,
      searchTerm,
      sortOrder,
      sortBy,
      fromDate,
      toDate,
   } = formatQuery(query, questionMappingSortableFields);

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
            $or: questionMappingSearchableFields.map((field) => ({
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

   const aggregated = await QuestionMapping.aggregate(pipeline);

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

// 4. GET QUESTION MAPPING BY ID
const getQuestionMappingById = async (id: string) => {
   const result = await QuestionMapping.findById(id);

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "QuestionMapping not found");
   }

   return result;
};

// 5. DELETE QUESTION MAPPING BY ID
const deleteQuestionMappingById = async (id: string) => {
   const result = await QuestionMapping.findOneAndDelete({ _id: id });

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "QuestionMapping not found");
   }

   return result;
};

export const questionMappingServices = {
   createQuestionMapping,
   updateQuestionMapping,
   getAllQuestionMapping,
   getQuestionMappingById,
   deleteQuestionMappingById,
};

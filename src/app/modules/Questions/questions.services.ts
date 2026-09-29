import httpStatus from "http-status";
import type { PipelineStage } from "mongoose";
import type {
   TCreateQuestionsPayloadType,
   TUpdateQuestionsPayloadType,
   TGetAllQuestionsQueryParamsType,
} from "./questions.validations";
import { AppError } from "../../errors";
import { Questions } from "./questions.model";
import { questionsSearchableFields } from "./questions.constants";

// 1. CREATE QUESTIONS
const createQuestions = async (payload: TCreateQuestionsPayloadType) => {
   const result = await Questions.create(payload);
   return result;
};

// 2. UPDATE QUESTIONS
const updateQuestions = async (id: string, payload: TUpdateQuestionsPayloadType) => {
   const result = await Questions.findOneAndUpdate(
      { _id: id },
      { $set: payload },
      { new: true },
   );

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "Questions not found");
   }

   return result;
};

// 3. GET ALL QUESTIONS
const getAllQuestions = async (query: TGetAllQuestionsQueryParamsType) => {
   const {
      page,
      limit,
      skip,
      searchTerm,
      sortOrder,
      sortBy,
      fromDate,
      toDate,
   } = formatQuery(query, questionsSortableFields);

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
            $or: questionsSearchableFields.map((field) => ({
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

   const aggregated = await Questions.aggregate(pipeline);

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

// 4. GET QUESTIONS BY ID
const getQuestionsById = async (id: string) => {
   const result = await Questions.findById(id);

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "Questions not found");
   }

   return result;
};

// 5. DELETE QUESTIONS BY ID
const deleteQuestionsById = async (id: string) => {
   const result = await Questions.findOneAndDelete({ _id: id });

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "Questions not found");
   }

   return result;
};

export const questionsServices = {
   createQuestions,
   updateQuestions,
   getAllQuestions,
   getQuestionsById,
   deleteQuestionsById,
};

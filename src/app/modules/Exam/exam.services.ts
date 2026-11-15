import httpStatus from "http-status";
import type { PipelineStage } from "mongoose";
import type {
   TCreateExamPayloadType,
   TUpdateExamPayloadType,
   TGetAllExamQueryParamsType,
} from "./exam.validations";
import { AppError } from "../../errors";
import { Exam } from "./exam.model";
import { examSearchableFields } from "./exam.constants";

// 1. CREATE EXAM
const createExam = async (payload: TCreateExamPayloadType) => {
   const result = await Exam.create(payload);
   return result;
};

// 2. UPDATE EXAM
const updateExam = async (id: string, payload: TUpdateExamPayloadType) => {
   const result = await Exam.findOneAndUpdate(
      { _id: id },
      { $set: payload },
      { new: true },
   );

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "Exam not found");
   }

   return result;
};

// 3. GET ALL EXAM
const getAllExam = async (query: TGetAllExamQueryParamsType) => {
   const {
      page,
      limit,
      skip,
      searchTerm,
      sortOrder,
      sortBy,
      fromDate,
      toDate,
   } = formatQuery(query, examSortableFields);

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
            $or: examSearchableFields.map((field) => ({
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

   const aggregated = await Exam.aggregate(pipeline);

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

// 4. GET EXAM BY ID
const getExamById = async (id: string) => {
   const result = await Exam.findById(id);

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "Exam not found");
   }

   return result;
};

// 5. DELETE EXAM BY ID
const deleteExamById = async (id: string) => {
   const result = await Exam.findOneAndDelete({ _id: id });

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "Exam not found");
   }

   return result;
};

export const examServices = {
   createExam,
   updateExam,
   getAllExam,
   getExamById,
   deleteExamById,
};

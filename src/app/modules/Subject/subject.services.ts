import httpStatus from "http-status";
import type { PipelineStage } from "mongoose";
import type {
   TCreateSubjectPayloadType,
   TUpdateSubjectPayloadType,
   TGetAllSubjectQueryParamsType,
} from "./subject.validations";
import { AppError } from "../../errors";
import { Subject } from "./subject.model";
import { subjectSearchableFields } from "./subject.constants";

// 1. CREATE SUBJECT
const createSubject = async (payload: TCreateSubjectPayloadType) => {
   const result = await Subject.create(payload);
   return result;
};

// 2. UPDATE SUBJECT
const updateSubject = async (id: string, payload: TUpdateSubjectPayloadType) => {
   const result = await Subject.findOneAndUpdate(
      { _id: id },
      { $set: payload },
      { new: true },
   );

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "Subject not found");
   }

   return result;
};

// 3. GET ALL SUBJECT
const getAllSubject = async (query: TGetAllSubjectQueryParamsType) => {
   const {
      page,
      limit,
      skip,
      searchTerm,
      sortOrder,
      sortBy,
      fromDate,
      toDate,
   } = formatQuery(query, subjectSortableFields);

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
            $or: subjectSearchableFields.map((field) => ({
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

   const aggregated = await Subject.aggregate(pipeline);

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

// 4. GET SUBJECT BY ID
const getSubjectById = async (id: string) => {
   const result = await Subject.findById(id);

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "Subject not found");
   }

   return result;
};

// 5. DELETE SUBJECT BY ID
const deleteSubjectById = async (id: string) => {
   const result = await Subject.findOneAndDelete({ _id: id });

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "Subject not found");
   }

   return result;
};

export const subjectServices = {
   createSubject,
   updateSubject,
   getAllSubject,
   getSubjectById,
   deleteSubjectById,
};

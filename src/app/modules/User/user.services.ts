import httpStatus from "http-status";
import type { PipelineStage } from "mongoose";
import type {
   TUpdateUserPayloadType,
   TGetAllUserQueryParamsType,
} from "./user.validations";
import { AppError } from "@/app/errors";
import { User } from "./user.model";
import { userSearchableFields } from "./user.constants";

const updateUser = async (id: string, payload: TUpdateUserPayloadType) => {
   const result = await User.findOneAndUpdate(
      { _id: id },
      { $set: payload },
      { new: true },
   );

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found");
   }

   return result;
};

const getAllUser = async (query: TGetAllUserQueryParamsType) => {
   const {
      page = 1,
      limit = 10,
      searchTerm,
      sortOrder = "desc",
      sortBy = "createdAt",
      fromDate,
      toDate,
   } = query;

   const skip = (page - 1) * limit;
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
            $or: userSearchableFields.map((field) => ({
               [field]: { $regex: searchTerm, $options: "i" },
            })),
         },
      });
   }

   pipeline.push({ $sort: { [sortBy]: sortOrder === "asc" ? 1 : -1 } });

   pipeline.push({
      $facet: {
         data: [{ $skip: skip }, { $limit: limit }],
         meta: [{ $count: "total" }],
      },
   });

   const aggregated = await User.aggregate(pipeline);

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

const getUserById = async (id: string) => {
   const result = await User.findById(id);

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found");
   }

   return result;
};

const deleteUserById = async (id: string) => {
   const result = await User.findOneAndDelete({ _id: id });

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found");
   }

   return result;
};

export const userServices = {
   updateUser,
   getAllUser,
   getUserById,
   deleteUserById,
};

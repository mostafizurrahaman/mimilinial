import httpStatus from "http-status";
import type { PipelineStage } from "mongoose";
type TCreateOtpPayloadType = any;
type TUpdateOtpPayloadType = any;
type TGetAllOtpQueryParamsType = any;
import { AppError } from "@/app/errors";
import { Otp } from "./otp.model";
import { otpSearchableFields } from "./otp.constants";

// 1. CREATE OTP
const createOtp = async (payload: TCreateOtpPayloadType) => {
  const result = await Otp.create(payload);
  return result;
};

// 2. UPDATE OTP
const updateOtp = async (id: string, payload: TUpdateOtpPayloadType) => {
  const result = await Otp.findOneAndUpdate(
    { _id: id },
    { $set: payload },
    { new: true },
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Otp not found");
  }

  return result;
};

// 3. GET ALL OTP
const getAllOtp = async (query: TGetAllOtpQueryParamsType) => {
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
        $or: otpSearchableFields.map((field) => ({
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

  const aggregated = await Otp.aggregate(pipeline);

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

// 4. GET OTP BY ID
const getOtpById = async (id: string) => {
  const result = await Otp.findById(id);

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Otp not found");
  }

  return result;
};

// 5. DELETE OTP BY ID
const deleteOtpById = async (id: string) => {
  const result = await Otp.findOneAndDelete({ _id: id });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Otp not found");
  }

  return result;
};

export const otpServices = {
  createOtp,
  updateOtp,
  getAllOtp,
  getOtpById,
  deleteOtpById,
};

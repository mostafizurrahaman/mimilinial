import httpStatus from "http-status";
import type {
   TCreateOtpPayloadType,
   TUpdateOtpPayloadType,
   TGetAllOtpQueryParamsType,
} from "./otp.validations";
import { AppError } from "@/app/errors";
import { db } from "@/app/db";
import { otps } from "@/app/db/schemas";
import {
   eq,
   and,
   gte,
   lte,
   ilike,
   or,
   asc,
   desc,
   count,
   SQL,
} from "drizzle-orm";

// 1. CREATE OTP
const createOtp = async (payload: TCreateOtpPayloadType) => {
   const [result] = await db.insert(otps).values(payload).returning();
   return result;
};

// 2. UPDATE OTP
const updateOtp = async (id: string, payload: TUpdateOtpPayloadType) => {
   const [result] = await db
      .update(otps)
      .set(payload)
      .where(eq(otps.id, id))
      .returning();

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
   const conditions: (SQL | undefined)[] = [];

   if (fromDate) conditions.push(gte(otps.createdAt, new Date(fromDate)));
   if (toDate) conditions.push(lte(otps.createdAt, new Date(toDate)));

   const whereClause =
      conditions.length > 0
         ? and(...(conditions.filter(Boolean) as SQL[]))
         : undefined;

   const orderBy = { createdAt: sortOrder === "asc" ? "asc" : "desc" } as const;

   const [data, [countResult]] = await Promise.all([
      db.query.otps.findMany({
         where: whereClause ? { RAW: whereClause } : undefined,
         orderBy,
         limit,
         offset: skip,
      }),
      db.select({ total: count() }).from(otps).where(whereClause),
   ]);

   const total = countResult?.total ?? 0;

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
   const result = await db.query.otps.findFirst({
      where: { id },
   });

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "Otp not found");
   }

   return result;
};

// 5. DELETE OTP BY ID
const deleteOtpById = async (id: string) => {
   const [result] = await db.delete(otps).where(eq(otps.id, id)).returning();

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

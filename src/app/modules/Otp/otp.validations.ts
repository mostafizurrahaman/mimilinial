import z from "zod";
import { OtpTypes } from "./otp.constants";

// Types used by otp.services.ts
export type TCreateOtpPayloadType = {
  userId: string;
  otpHash: string;
  type: "signup" | "reset";
  expiresAt: Date;
  lastSentAt: Date;
};

export type TUpdateOtpPayloadType = Partial<TCreateOtpPayloadType>;

export type TGetAllOtpQueryParamsType = {
  page?: number;
  limit?: number;
  searchTerm?: string;
  sortOrder?: "asc" | "desc";
  sortBy?: string;
  fromDate?: string;
  toDate?: string;
};
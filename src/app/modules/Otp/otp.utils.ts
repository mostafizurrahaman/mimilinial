import type { TOtpType } from "./otp.constants";
import { generateOtp, hashPassword } from "@/app/utils";
import { configs } from "@/app/configs";
import { db } from "@/app/db";
import { otps } from "@/app/db/schemas";
import { eq, and } from "drizzle-orm";
import moment from "moment";
import { AppError, BadRequest } from "@/app/errors";
import httpStatus from "http-status";

// ?? 1. Create or replace OTP (upsert by userId + type):
export const createOrReplaceOTP = async (userId: string, type: TOtpType) => {
   // ?? Generate OTP:
   const otp = generateOtp({
      length: configs.otpSettings.digits,
      numericOnly: true,
   });

   // ?? Hash OTP:
   const otpHash = await hashPassword(otp, configs.passwordSaltRound);

   // ?? Calculate expiry:
   const now = moment().toDate();
   const expiresAt = moment()
      .add(configs.otpSettings.expiresIn, "minutes")
      .toDate();

   // ?? Delete any existing OTP for this user+type, then insert fresh:
   await db
      .delete(otps)
      .where(and(eq(otps.userId, userId), eq(otps.type, type)));

   const [otpRecord] = await db
      .insert(otps)
      .values({
         userId,
         otpHash,
         type,
         expiresAt,
         lastSentAt: now,
      })
      .returning();

   if (!otpRecord) {
      throw new AppError(httpStatus.BAD_REQUEST, "Failed to save otp.");
   }

   return {
      otp,
      otpRecord,
   };
};

// ?? Check OTP resend cooldown:
export const checkResendCoolDown = (lastSentAt: Date) => {
   const elapsed = moment().diff(lastSentAt);
   const cooldownMs = configs.otpSettings.resendWindowInSeconds * 1000;

   if (elapsed < cooldownMs) {
      const remainingSeconds = Math.ceil((cooldownMs - elapsed) / 1000);

      throw new BadRequest(
         `Please wait ${remainingSeconds} seconds before requesting another OTP`,
      );
   }
};

// ?? 2. Create or replace OTP in a transaction (upsert by userId + type):
export const createOrReplaceOTPTx = async (tx: any, userId: string, type: TOtpType) => {
   // ?? Generate OTP:
   const otp = generateOtp({
      length: configs.otpSettings.digits,
      numericOnly: true,
   });

   // ?? Hash OTP:
   const otpHash = await hashPassword(otp, configs.passwordSaltRound);

   // ?? Calculate expiry:
   const now = moment().toDate();
   const expiresAt = moment()
      .add(configs.otpSettings.expiresIn, "minutes")
      .toDate();

   // ?? Delete any existing OTP for this user+type, then insert fresh:
   await tx
      .delete(otps)
      .where(and(eq(otps.userId, userId), eq(otps.type, type)));

   const [otpRecord] = await tx
      .insert(otps)
      .values({
         userId,
         otpHash,
         type,
         expiresAt,
         lastSentAt: now,
      })
      .returning();

   if (!otpRecord) {
      throw new AppError(httpStatus.BAD_REQUEST, "Failed to save otp.");
   }

   return {
      otp,
      otpRecord,
   };
};

import type { Types } from "mongoose";
import type { TOtpType } from "./otp.constants";
import { generateOtp, hashPassword } from "@/app/utils";
import { configs } from "@/app/configs";
import { Otp } from "./otp.model";
import moment from "moment";
import { AppError, BadRequest } from "@/app/errors";
import httpStatus from "http-status";
import type mongoose from "mongoose";

// ?? 1. Create OTP:
export const createOrReplaceOTP = async (
  userId: Types.ObjectId,
  type: TOtpType,
  session?: mongoose.mongo.ClientSession,
) => {
  console.log({
    userId,
    type,
    session,
  });
  // ?? Generate OTP:
  const otp = generateOtp({
    length: configs.otpSettings.digits,
    numericOnly: true,
  });

  // ?? Hash OTP:
  const otpHash = await hashPassword(otp, configs.passwordSaltRound);

  // ?? Calculate five me from now:
  const now = moment().toDate();
  const expiresAt = moment()
    .add(configs.otpSettings.expiresIn, "minutes")
    .toDate();

  // ?? Find out the otp and replace it:
  const otpRecord = await Otp.findOneAndReplace(
    {
      user: userId,
    },
    {
      user: userId,
      otpHash,
      type,
      expiresAt,
      lastSentAt: now,
    },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
      session: session,
    },
  );

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
  // ?? Resend cooldown window:
  const elapsed = moment().diff(lastSentAt);
  const cooldownMs = configs.otpSettings.resendWindowInSeconds * 1000;

  if (elapsed < cooldownMs) {
    const remainingSeconds = Math.ceil((cooldownMs - elapsed) / 1000);

    throw new BadRequest(
      `Please wait ${remainingSeconds} seconds before requesting another OTP`,
    );
  }
};

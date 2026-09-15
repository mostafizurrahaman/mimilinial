import { Schema, model } from "mongoose";
import type { IOtpDoc } from "./otp.interfaces";
import { OtpTypes, otpTypeValues } from "./otp.constants";

const otpSchema = new Schema<IOtpDoc>(
   {
      user: {
         type: Schema.Types.ObjectId,
         ref: "User",
         required: true,
         unique: true,
         index: true,
      },
      otpHash: {
         type: String,
         required: true,
      },
      type: {
         type: String,
         enum: otpTypeValues,
         required: true,
      },
      expiresAt: {
         type: Date,
         expires: 0,
         required: true,
      },
      lastSentAt: {
         type: Date,
         required: true,
      },
   },
   {
      timestamps: true,
      versionKey: false,
   },
);

export const Otp = model<IOtpDoc>("Otp", otpSchema);

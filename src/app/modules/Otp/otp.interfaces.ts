import { Document, Types } from "mongoose";
import type { TOtpType } from "./otp.constants";

export interface IOtp {
   user: Types.ObjectId;
   otpHash: string;
   type: TOtpType;
   expiresAt: Date;
   lastSentAt: Date;
}

export interface IOtpDoc extends Document, IOtp {}

import { Document, Model } from "mongoose";
import type {
   TAuthProviderType,
   TUserRole,
   TUserStatus,
} from "./user.constants";

export interface IUser {
   name: string;
   email: string;
   phone: string;
   password: string;
   status: TUserStatus;
   // roles:
   role: TUserRole;
   // profile common properties:
   profileImage?: string;

   // ?? Auth Provider?:
   authProviders: TAuthProviderType[];
   googleId?: string;

   // 2FA:
   twoFactorSecret?: string;
   isTwoFactorEnabled: boolean;
   twoFactorBackupCodes?: string[];
   isOtpVerified: boolean;

   // reason:
   blockedReason?: string;
   deletionReason?: string;

   // common timestamps:
   blockedAt?: Date;
   deletedAt?: Date;
   passwordChangedAt?: Date;
   lastLoginAt?: Date;
   lastActivityAt?: Date;
   createdAt: Date;
   updatedAt: Date;
}

export interface IUserDoc extends Document, IUser {}

export interface IUserModel extends Model<IUserDoc> {
   isJwtIssuedBefore: (
      passwordChangedAt: Date,
      jwtIssuedAt: Date,
   ) => Promise<boolean>;
}

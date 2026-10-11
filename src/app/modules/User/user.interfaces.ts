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
   profileImage?: string | null;

   // ?? Auth Provider?:
   authProviders: TAuthProviderType[];
   googleId?: string;

   // 2FA:
   twoFactorSecret?: string;
   isTwoFactorEnabled: boolean;
   twoFactorBackupCodes?: string[];
   isOtpVerified: boolean;

   // reason:
   blockedReason?: string | null;
   deletionReason?: string | null;

   // common timestamps:
   blockedAt?: Date | null;
   deletedAt?: Date | null;
   passwordChangedAt?: Date;
   logOutAt?: Date;
   lastLoginAt?: Date;
   lastActivityAt?: Date;
   createdAt: Date;
   updatedAt: Date;
}

export interface IUserDoc extends Document, IUser {
   isJwtIssuedBeforePasswordChanged: (jwtIssuedTimestamp: number) => boolean;
}

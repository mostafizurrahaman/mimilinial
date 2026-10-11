import { Schema, model } from "mongoose";
import type { IUserDoc } from "./user.interfaces";
import {
   authProviderValues,
   UserRoles,
   userRoleValues,
   UserStatus,
   userStatusValues,
} from "./user.constants";

const userSchema = new Schema<IUserDoc>(
   {
      name: {
         type: String,
         required: true,
      },
      email: {
         type: String,
         required: true,
         index: true,
         unique: true,
      },
      phone: {
         type: String,
         required: true,
         index: true,
         unique: true,
      },
      password: {
         type: String,
         allowNull: true,
         select: false,
      },
      role: {
         type: String,
         enum: userRoleValues,
         default: UserRoles.USER,
         required: true,
      },
      status: {
         type: String,
         enum: userStatusValues,
         default: UserStatus.PENDING,
      },
      profileImage: {
         type: String,
         allowNull: true,
      },
      isOtpVerified: {
         type: Boolean,
         required: true,
         default: false,
      },

      authProviders: {
         type: [String],
         enum: authProviderValues,
         required: true,
         min: 1,
      },
      googleId: {
         type: String,
         allowNull: true,
      },

      isTwoFactorEnabled: {
         type: Boolean,
         required: true,
         default: false,
      },
      twoFactorSecret: {
         type: String,
         select: false,
      },
      twoFactorBackupCodes: {
         type: [String],
         required: true,
         select: false,
      },
      blockedReason: {
         type: String,
         allowNull: true,
      },
      deletionReason: {
         type: String,
         allowNull: true,
      },
      blockedAt: {
         type: Date,
         allowNull: true,
      },
      deletedAt: {
         type: Date,
         allowNull: true,
      },
      passwordChangedAt: {
         type: Date,
         allowNull: true,
      },
      logOutAt: {
         type: Date,
         allowNull: true,
      },
      lastLoginAt: {
         type: Date,
         allowNull: true,
      },
      lastActivityAt: {
         type: Date,
         allowNull: true,
      },
   },
   {
      timestamps: true,
      versionKey: false,
   },
);

// 9. Compare is jwt issued before password changed ?
userSchema.methods.isJwtIssuedBeforePasswordChanged = function (
   jwtIssuedTimestamp: number,
): boolean {
   if (!this.passwordChangedAt) {
      return false;
   }

   // Convert to milliseconds
   const jwtIssuedTime = jwtIssuedTimestamp * 1000;

   // Compare
   return jwtIssuedTime < this.passwordChangedAt.getTime();
};

userSchema.post("save", function (doc, next) {
   doc.password = "";
   doc.twoFactorBackupCodes = [];
   doc.twoFactorSecret = "";
   next();
});

export const User = model<IUserDoc>("User", userSchema);

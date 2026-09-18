import httpStatus from "http-status";
import type {
   TCreateUserPayloadType,
   TResendSignupOTPPayloadType,
   TVerifySignupOTPPayloadType,
   TLoginPayloadType,
   TForgotPasswordPayloadType,
   TResetPasswordPayloadType,
   TChangePasswordPayload,
} from "./auth.validations";
import {
   AppError,
   BadRequest,
   ForbiddenError,
   NotFoundError,
   UnauthorizedError,
} from "@/app/errors";

import type { TMulterFile } from "@/app/interfaces/multer.types";
import uploadFileIntoCloudinary from "@/app/utils/cloudinary/upload-file";
import { File_FOLDER_NAME } from "@/app/constants/folder_name";
import {
   catchAsync,
   comparePassword,
   createToken,
   hashPassword,
   verifyToken,
} from "@/app/utils";
import { configs } from "@/app/configs";
import {
   checkResendCoolDown,
   createOrReplaceOTP,
   createOrReplaceOTPTx,
   OtpTypes,
} from "@/app/modules/Otp";
import { deleteFileByUrl } from "@/app/utils/cloudinary/delete-file";
import { sendEmail } from "@/app/utils/send-email";
import type { IJwtUserPayload } from "@/app/interfaces";
import moment from "moment";
import { UserStatus } from "../User";
import { isJwtIssuedBeforePasswordChanged } from "../User/user.constants";
import { db } from "@/app/db";
import { users, otps } from "@/app/db/schemas";
import { eq, and } from "drizzle-orm";

/**
 * CREATE USER:
 */
const createUser = async (
   payload: TCreateUserPayloadType,
   profileImage: TMulterFile,
) => {
   const { email, name, phone, password } = payload;

   // ?? Check if email already in use:
   const existingUser = await db.query.users.findFirst({
      where: { email },
   });

   if (existingUser) {
      if (existingUser.isOtpVerified) {
         throw new BadRequest(
            `This email already in use. Account status "${existingUser.status}"`,
         );
      } else {
         // ?? Find OTP for this user:
         const existingOTP = await db.query.otps.findFirst({
            where: { userId: existingUser.id, type: OtpTypes.SIGNUP },
         });

         // ?? Cooldown:
         if (existingOTP) {
            checkResendCoolDown(existingOTP.lastSentAt);
         }

         const otp = await createOrReplaceOTP(existingUser.id, OtpTypes.SIGNUP);

         sendEmail(
            existingUser.email,
            "Your account verification OTP has been resent",
            `Your Account OTP is ${otp.otp}`,
            `<h1>Your Account OTP is ${otp.otp}</h1>`,
            configs.nodeMailer.replyTo,
         );

         return {
            message: `OTP resent successfully. Verify your account.`,
         };
      }
   }

   // ?? Check phone already in use:
   const existingPhone = await db.query.users.findFirst({
      where: { phone },
   });

   if (existingPhone) {
      throw new AppError(
         httpStatus.BAD_REQUEST,
         "This phone number already in use.",
      );
   }

   let newProfileUrl: string | null = null;

   // ?? File Upload:
   if (profileImage) {
      const uploadedFile = await uploadFileIntoCloudinary(
         profileImage,
         File_FOLDER_NAME.PROFILE_IMAGES,
      );
      newProfileUrl = uploadedFile?.url as string;
   }

   // ?? Hash the password:
   const hashedPassword = await hashPassword(
      password,
      configs.passwordSaltRound,
   );

   try {
      // ?? Create user + OTP in a transaction:
      const newUser = await db.transaction(async (tx) => {
         const [user] = await tx
            .insert(users)
            .values({
               name,
               email,
               phone,
               password: hashedPassword,
               profileImage: newProfileUrl,
               authProvider: ["email"],
               twoFactorBackupCodes: [],
            })
            .returning();

         if (!user) {
            throw new AppError(
               httpStatus.BAD_REQUEST,
               "Failed to create user.",
            );
         }

         // ?? Create OTP:
         const otp = await createOrReplaceOTPTx(tx, user.id, OtpTypes.SIGNUP);

         if (!otp) {
            throw new AppError(httpStatus.BAD_REQUEST, "Failed to save otp");
         }

         sendEmail(
            user.email,
            "Your account verification OTP has been sent",
            `Your Account OTP is ${otp.otp}`,
            `<h1>Your Account OTP is ${otp.otp}</h1>`,
            configs.nodeMailer.replyTo,
         );

         return user;
      });

      return {
         message: "Your account created successfully. Verify your account.",
         userId: newUser.id,
         email: newUser.email,
         role: newUser.role,
         status: newUser.status,
      };
   } catch (error) {
      if (newProfileUrl) {
         deleteFileByUrl(newProfileUrl).catch((err) => console.log(err));
      }
      throw error;
   }
};

/**
 * RESEND SIGNUP OTP:
 */
const resendSignupOTP = async (payload: TResendSignupOTPPayloadType) => {
   const { email } = payload;

   const user = await db.query.users.findFirst({
      where: { email },
   });
   if (!user) {
      throw new NotFoundError("User not found.");
   }

   if (user.isOtpVerified) {
      throw new BadRequest("You account has already been verified.");
   }

   if (user.status !== UserStatus.PENDING) {
      throw new BadRequest(
         `You account is not pending, current status "${user.status}".`,
      );
   }

   const otp = await db.query.otps.findFirst({
      where: { userId: user.id, type: OtpTypes.SIGNUP },
   });

   if (otp) {
      checkResendCoolDown(otp.lastSentAt);
   }

   const newOtp = await createOrReplaceOTP(user.id, OtpTypes.SIGNUP);

   if (!newOtp) {
      throw new BadRequest("Failed to generate new OTP.");
   }

   sendEmail(
      user.email,
      "Your account verification OTP has been resent",
      `Your Account OTP is ${newOtp.otp}`,
      `<h1>Your Account OTP is ${newOtp.otp}</h1>`,
      configs.nodeMailer.replyTo,
   );
};

/**
 * VERIFY SIGNUP OTP:
 */
const verifySignupOTP = async (payload: TVerifySignupOTPPayloadType) => {
   const { email, otp } = payload;

   const user = await db.query.users.findFirst({
      where: { email },
   });
   if (!user) {
      throw new NotFoundError("User not found.");
   }

   if (user.isOtpVerified) {
      throw new BadRequest("You account has already been verified.");
   }

   if (user.status !== UserStatus.PENDING) {
      throw new BadRequest(
         `You account is not pending, current status "${user.status}".`,
      );
   }

   const existingOTP = await db.query.otps.findFirst({
      where: { userId: user.id, type: OtpTypes.SIGNUP },
   });

   if (!existingOTP) {
      throw new BadRequest("Invalid OTP");
   }

   if (existingOTP.expiresAt < moment().toDate()) {
      throw new BadRequest("OTP has been expired.");
   }

   const isOtpMatched = await comparePassword(otp, existingOTP.otpHash);
   if (!isOtpMatched) {
      throw new BadRequest("Invalid OTP");
   }

   await db.transaction(async (tx) => {
      await tx
         .update(users)
         .set({ isOtpVerified: true, status: "active" })
         .where(eq(users.id, user.id));

      await tx
         .delete(otps)
         .where(
            and(
               eq(otps.userId, user.id),
               eq(otps.otpHash, existingOTP.otpHash),
            ),
         );
   });

   return null;
};

/**
 * LOGIN
 */
const login = async (payload: TLoginPayloadType) => {
   const { email, password } = payload;

   const user = await db.query.users.findFirst({
      where: { email },
   });
   if (!user) {
      throw new NotFoundError("User not found.");
   }

   if (!user.isOtpVerified) {
      throw new BadRequest(
         "Your account is not verified yet. Please verify with signup OTP.",
      );
   }

   if (user.status === UserStatus.PENDING) {
      throw new ForbiddenError(
         `Your account is Pending yet. Please verify OTP.`,
      );
   }

   if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenError(`Your account is blocked.`);
   }

   if (user.status === UserStatus.DELETED) {
      throw new ForbiddenError("You account has been deleted.");
   }

   const isPasswordMatched = await comparePassword(
      password,
      user.password ?? "",
   );
   if (!isPasswordMatched) {
      throw new BadRequest("Credential not matched.");
   }

   const tokenPayload: IJwtUserPayload = {
      _id: user.id,
      email: user.email,
      name: user.name,
      profileImage: user.profileImage ?? "",
      status: user.status ?? "pending",
      role: user.role ?? "user",
   };

   const accessToken = createToken(
      tokenPayload,
      configs.jwt.accessToken.secret,
      configs.jwt.accessToken.expiresIn,
   );

   const refreshToken = createToken(
      tokenPayload,
      configs.jwt.refreshToken.secret,
      configs.jwt.refreshToken.expiresIn,
   );

   return {
      accessToken,
      refreshToken,
      email: user.email,
      role: user.role,
      status: user.status,
   };
};

/**
 * Forgot password
 */
const forgotPassword = async (payload: TForgotPasswordPayloadType) => {
   const { email } = payload;

   const user = await db.query.users.findFirst({
      where: { email },
   });

   if (!user) {
      throw new NotFoundError("User not found.");
   }

   if (!user.isOtpVerified) {
      throw new BadRequest(
         "Your account is not verified yet. Please verify with signup OTP.",
      );
   }

   if (user.status === UserStatus.PENDING) {
      throw new ForbiddenError(
         `Your account is Pending yet. Please verify your account.`,
      );
   }

   if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenError(`Your account is blocked.`);
   }

   if (user.status === UserStatus.DELETED) {
      throw new ForbiddenError("You account has been deleted.");
   }

   if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenError("You account is not active yet.");
   }

   const otp = await db.query.otps.findFirst({
      where: { userId: user.id, type: OtpTypes.RESET },
   });

   if (otp) {
      checkResendCoolDown(otp.lastSentAt);
   }

   const newOTP = await createOrReplaceOTP(user.id, OtpTypes.RESET);

   sendEmail(
      user.email,
      "Your Password Reset OTP",
      `Your password reset OTP is ${newOTP.otp}. This OTP will expire shortly.`,
      `<h1>Password Reset OTP</h1>
   <p>Your password reset OTP is:</p>
   <h2>${newOTP.otp}</h2>
   <p>This OTP will expire shortly.</p>
   <p>If you did not request a password reset, please ignore this email.</p>`,
      configs.nodeMailer.replyTo,
   );

   return {
      resendAvailableAt: moment(newOTP?.otpRecord?.lastSentAt)
         .add(configs.otpSettings.resendWindowInSeconds, "seconds")
         ?.toDate(),
   };
};

/**
 * Verify Reset Password OTP
 */
const verifyResetPasswordOTP = async (payload: TVerifySignupOTPPayloadType) => {
   const { email, otp } = payload;

   const user = await db.query.users.findFirst({
      where: { email },
   });

   if (!user) {
      throw new NotFoundError("User not found.");
   }

   if (!user.isOtpVerified) {
      throw new BadRequest(
         "Your account is not verified yet. Please verify with signup OTP.",
      );
   }

   if (user.status === UserStatus.PENDING) {
      throw new ForbiddenError(
         `Your account is Pending yet. Please verify your account.`,
      );
   }

   if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenError(`Your account is blocked.`);
   }

   if (user.status === UserStatus.DELETED) {
      throw new ForbiddenError("You account has been deleted.");
   }

   if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenError("You account is not active yet.");
   }

   const existingOTP = await db.query.otps.findFirst({
      where: { userId: user.id, type: OtpTypes.RESET },
   });

   if (!existingOTP) {
      throw new BadRequest("Invalid OTP.");
   }

   if (existingOTP.expiresAt < moment().toDate()) {
      throw new BadRequest("OTP has been expired.");
   }

   const isOtpMatched = await comparePassword(otp, existingOTP?.otpHash);
   if (!isOtpMatched) {
      throw new BadRequest("Invalid OTP.");
   }

   await db
      .delete(otps)
      .where(
         and(eq(otps.userId, user.id), eq(otps.otpHash, existingOTP.otpHash)),
      );

   const resetPasswordTokenPayload: IJwtUserPayload = {
      _id: user.id,
      email: user.email,
      name: user.name,
      profileImage: user.profileImage ?? "",
      status: user.status ?? "pending",
      role: user.role ?? "user",
   };

   const token = createToken(
      resetPasswordTokenPayload,
      configs.jwt.resetToken.secret,
      configs.jwt.resetToken.expiresIn,
   );

   return { token };
};

/**
 * Reset Password:
 */
const resetPassword = async (payload: TResetPasswordPayloadType) => {
   const { token, password } = payload;

   const decode = verifyToken(token, configs.jwt.resetToken.secret);
   if (!decode.email) {
      throw new ForbiddenError("Invalid reset token.");
   }

   const user = await db.query.users.findFirst({
      where: { email: decode.email },
   });

   if (!user) {
      throw new NotFoundError("User not found.");
   }

   if (!user.isOtpVerified) {
      throw new BadRequest(
         "Your account is not verified yet. Please verify with signup OTP.",
      );
   }

   if (user.status === UserStatus.PENDING) {
      throw new ForbiddenError(
         `Your account is Pending yet. Please verify your account.`,
      );
   }

   if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenError(`Your account is blocked.`);
   }

   if (user.status === UserStatus.DELETED) {
      throw new ForbiddenError("You account has been deleted.");
   }

   if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenError("You account is not active yet.");
   }

   if (
      isJwtIssuedBeforePasswordChanged(
         user.passwordChangedAt,
         decode.iat as number,
      )
   ) {
      throw new UnauthorizedError("Token is expired. Please login");
   }

   const hashedPassword = await hashPassword(
      password,
      configs.passwordSaltRound,
   );

   await db
      .update(users)
      .set({
         password: hashedPassword,
         passwordChangedAt: moment().startOf("seconds").toDate(),
      })
      .where(eq(users.id, user.id));

   return null;
};

/**
 * Change password:
 */
const changePassword = async (
   currentUser: {
      id: string;
      password: string | null;
      passwordChangedAt?: Date | null;
   },
   payload: TChangePasswordPayload,
) => {
   const { newPassword, oldPassword } = payload;

   const isPasswordMatched = await comparePassword(
      oldPassword,
      currentUser.password ?? "",
   );
   if (!isPasswordMatched) {
      throw new BadRequest("Credential not matched.");
   }

   const hashedPassword = await hashPassword(
      newPassword,
      configs.passwordSaltRound,
   );

   const [updatedUser] = await db
      .update(users)
      .set({
         password: hashedPassword,
         passwordChangedAt: moment().startOf("second")?.toDate(),
      })
      .where(eq(users.id, currentUser.id))
      .returning();

   const tokenPayload: IJwtUserPayload = {
      _id: updatedUser!.id,
      email: updatedUser!.email,
      name: updatedUser!.name,
      profileImage: updatedUser!.profileImage ?? "",
      status: updatedUser!.status ?? "pending",
      role: updatedUser!.role ?? "user",
   };

   const accessToken = createToken(
      tokenPayload,
      configs.jwt.accessToken.secret,
      configs.jwt.accessToken.expiresIn,
   );

   const refreshToken = createToken(
      tokenPayload,
      configs.jwt.refreshToken.secret,
      configs.jwt.refreshToken.expiresIn,
   );

   return { accessToken, refreshToken };
};

/**
 * Refresh Token
 */
const refreshToken = async (token: string) => {
   const decoded = verifyToken(token, configs.jwt.refreshToken.secret);
   if (!decoded.email) {
      throw new UnauthorizedError("Invalid token");
   }

   const user = await db.query.users.findFirst({
      where: { id: decoded._id },
   });

   if (!user) {
      throw new UnauthorizedError("User not found.");
   }

   if (!user.isOtpVerified) {
      throw new UnauthorizedError(
         "Your account is not verified yet. Please verify your account.",
      );
   }

   if (user.status === UserStatus.PENDING) {
      throw new ForbiddenError(
         `Your account is Pending yet. Please verify your account.`,
      );
   }

   if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenError(`Your account is blocked.`);
   }

   if (user.status === UserStatus.DELETED) {
      throw new ForbiddenError("You account has been deleted.");
   }

   if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenError("You account is not active yet.");
   }

   console.log("User password changed at:", user.passwordChangedAt);
   console.log("JWT Issued at:", decoded.iat);

   if (
      isJwtIssuedBeforePasswordChanged(
         user.passwordChangedAt,
         decoded.iat as number,
      )
   ) {
      throw new UnauthorizedError("You are not authorized.");
   }

   const tokenPayload: IJwtUserPayload = {
      _id: user.id,
      email: user.email,
      name: user.name,
      profileImage: user.profileImage ?? "",
      status: user.status ?? "pending",
      role: user.role ?? "user",
   };

   const accessToken = createToken(
      tokenPayload,
      configs.jwt.accessToken.secret,
      configs.jwt.accessToken.expiresIn,
   );

   const refreshToken = createToken(
      tokenPayload,
      configs.jwt.refreshToken.secret,
      configs.jwt.refreshToken.expiresIn,
   );

   return { accessToken, refreshToken };
};

export const authServices = {
   createUser,
   resendSignupOTP,
   verifySignupOTP,
   login,
   forgotPassword,
   verifyResetPasswordOTP,
   resetPassword,
   changePassword,
   refreshToken,
};

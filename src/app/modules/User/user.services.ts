import httpStatus from "http-status";
import type { PipelineStage } from "mongoose";
import type {
  TCreateUserPayloadType,
  TUpdateUserPayloadType,
  TGetAllUserQueryParamsType,
  TResendSignupOTPPayloadType,
  TVerifySignupOTPPayloadType,
  TLoginPayloadType,
  TForgotPasswordPayloadType,
  TResetPasswordPayloadType,
  TChangePasswordPayload,
} from "./user.validations";
import {
  AppError,
  BadRequest,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "@/app/errors";
import { User } from "./user.model";
import { UserRoles, userSearchableFields, UserStatus } from "./user.constants";
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
import mongoose from "mongoose";
import {
  checkResendCoolDown,
  createOrReplaceOTP,
  Otp,
  OtpTypes,
} from "@/app/modules/Otp";
import { deleteFileByUrl } from "@/app/utils/cloudinary/delete-file";
import { sendEmail } from "@/app/utils/send-email";
import type { IJwtUserPayload } from "@/app/interfaces";
import moment from "moment";
import type { IUser, IUserDoc } from "./user.interfaces";

/**
 * CREATE USER:
 */
const createUser = async (
  payload: TCreateUserPayloadType,
  profileImage: TMulterFile,
) => {
  const { email, name, phone, password } = payload;

  // ?? Check with this email is any user exists?
  const existingUser = await User.findOne({
    email,
  });

  if (existingUser) {
    if (existingUser.isOtpVerified) {
      throw new BadRequest(
        `This email already in use. Account status "${existingUser.status}"`,
      );
    } else {
      // ?? Find the otp for this user :
      const existingOTP = await Otp.findOne({
        user: existingUser?._id,
        type: OtpTypes.SIGNUP,
      });

      // ?? Cooldown:
      if (existingOTP) {
        checkResendCoolDown(existingOTP.lastSentAt);
      }

      const otp = await createOrReplaceOTP(existingUser?._id, OtpTypes.SIGNUP);

      sendEmail(
        existingUser?.email,
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

  // ?? Check this phone number already in use?:
  const associatedUserWithPhone = await User.findOne({
    phone,
  });

  if (associatedUserWithPhone) {
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
    newProfileUrl = uploadedFile?.url!;
  }

  // ?? Hash the password:
  const hashedPassword = await hashPassword(
    password,
    configs.passwordSaltRound,
  );

  // ?? mongoose Session :
  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();

    // ?? Create The user into db:
    const [user] = await User.create(
      [
        {
          name,
          email,
          phone,
          password: hashedPassword,
          profileImage: newProfileUrl!,
          authProviders: ["email"],
        },
      ],
      {
        session: mongoSession,
      },
    );

    if (!user) {
      throw new AppError(httpStatus.BAD_REQUEST, "Failed to create user.");
    }

    // ?? Create OTP:
    const otp = await createOrReplaceOTP(
      user?._id,
      OtpTypes.SIGNUP,
      mongoSession,
    );

    if (!otp) {
      throw new AppError(httpStatus.BAD_REQUEST, "Failed to save otp");
    }

    await mongoSession.commitTransaction();

    sendEmail(
      user?.email,
      "Your account verification OTP has been sent",
      `Your Account OTP is ${otp.otp}`,
      `<h1>Your Account OTP is ${otp.otp}</h1>`,
      configs.nodeMailer.replyTo,
    );

    return {
      message: "Your account created successfully. Verify your account.",
      userId: user?._id,
      email: user.email,
      role: user.role,
      status: user.status,
    };
  } catch (error) {
    if (newProfileUrl) {
      deleteFileByUrl(newProfileUrl).catch((err) => console.log(err));
    }
    await mongoSession.abortTransaction();
    throw error;
  } finally {
    await mongoSession.endSession();
  }
};

/**
 * RESEND SIGNUP OTP:
 */
const resendSignupOTP = async (payload: TResendSignupOTPPayloadType) => {
  const { email } = payload;

  // ?? Find User with email:
  const user = await User.findOne({
    email,
  });
  if (!user) {
    throw new NotFoundError("User not found.");
  }

  // ?? Check  is OTP already verified:
  if (user.isOtpVerified) {
    throw new BadRequest("You account has already been verified.");
  }

  // ?? Check NOT
  if (user.status !== UserStatus.PENDING) {
    throw new BadRequest(
      `You account is not pending, current status "${user.status}".`,
    );
  }

  // ?? Find OTP:
  const otp = await Otp.findOne({
    user: user?._id,
    type: OtpTypes.SIGNUP,
  });

  // ?? Check  Cooldown period:
  if (otp) {
    checkResendCoolDown(otp.lastSentAt);
  }

  // ?? Generate a new OTP:
  const newOtp = await createOrReplaceOTP(user?._id, OtpTypes.SIGNUP);

  if (!newOtp) {
    throw new BadRequest("Failed to generate new OTP.");
  }

  sendEmail(
    user?.email,
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

  // ?? Find User with email:
  const user = await User.findOne({
    email,
  });
  if (!user) {
    throw new NotFoundError("User not found.");
  }

  // ?? Check  is OTP already verified:
  if (user.isOtpVerified) {
    throw new BadRequest("You account has already been verified.");
  }

  // ?? Check NOT
  if (user.status !== UserStatus.PENDING) {
    throw new BadRequest(
      `You account is not pending, current status "${user.status}".`,
    );
  }

  // ?? Find OTP:
  const existingOTP = await Otp.findOne({
    user: user?._id,
    type: OtpTypes.SIGNUP,
  });

  if (!existingOTP) {
    throw new BadRequest("Invalid OTP");
  }

  if (existingOTP.expiresAt < moment().toDate()) {
    throw new BadRequest("OTP has been expired.");
  }

  // ?? Is OTP Matched?:
  const isOtpMatched = await comparePassword(otp, existingOTP.otpHash);
  if (!isOtpMatched) {
    throw new BadRequest("Invalid OTP");
  }

  const mongoSession = await mongoose.startSession();

  try {
    mongoSession.startTransaction();
    user.isOtpVerified = true;
    user.status = UserStatus.ACTIVE;

    await user.save({
      session: mongoSession,
    });

    await Otp.findOneAndDelete({
      user: user?._id,
      otpHash: existingOTP.otpHash,
    });

    await mongoSession.commitTransaction();
    return null;
  } catch (error) {
    await mongoSession.abortTransaction();
    throw error;
  } finally {
    await mongoSession.endSession();
  }
};

/**
 * LOGIN
 */
const login = async (payload: TLoginPayloadType) => {
  const { email, password } = payload;

  // ?? Find User with email:
  const user = await User.findOne({
    email,
  }).select("+password");
  if (!user) {
    throw new NotFoundError("User not found.");
  }

  //  TODO: To check roles Allowed or not:

  // ?? Check  is OTP already verified:
  if (!user.isOtpVerified) {
    throw new BadRequest(
      "Your account is not verified yet. Please verify with signup OTP.",
    );
  }

  // ?? Check is account still pending?:
  if (user.status === UserStatus.PENDING) {
    throw new ForbiddenError(`Your account is Pending yet. Please verify OTP.`);
  }

  // ?? Check is account blocked:
  if (user.status === UserStatus.BLOCKED) {
    throw new ForbiddenError(`Your account is blocked.`);
  }

  // ?? Check is account deleted ?:
  if (user.status === UserStatus.DELETED) {
    throw new ForbiddenError("You account has been deleted.");
  }

  // ?? Verify is password matched:
  const isPasswordMatched = await comparePassword(password, user.password);
  if (!isPasswordMatched) {
    throw new BadRequest("Credential not matched.");
  }

  //  ?? Prepare token payload
  const tokenPayload: IJwtUserPayload = {
    _id: user?._id?.toString(),
    email: user?.email,
    name: user?.name,
    profileImage: user?.profileImage!,
    status: user?.status,
    role: user?.role,
  };

  // ?? Generate JWT Token:
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
    email: user?.email,
    role: user?.role,
    status: user?.status,
  };
};

/**
 * Forgot password
 */
const forgotPassword = async (payload: TForgotPasswordPayloadType) => {
  const { email } = payload;

  // ?? Find User with email:
  const user = await User.findOne({
    email,
  });

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  // ?? Check  is OTP already verified:
  if (!user.isOtpVerified) {
    throw new BadRequest(
      "Your account is not verified yet. Please verify with signup OTP.",
    );
  }

  // ?? Check is account still pending?:
  if (user.status === UserStatus.PENDING) {
    throw new ForbiddenError(
      `Your account is Pending yet. Please verify your account.`,
    );
  }

  // ?? Check is account blocked:
  if (user.status === UserStatus.BLOCKED) {
    throw new ForbiddenError(`Your account is blocked.`);
  }

  // ?? Check is account deleted ?:
  if (user.status === UserStatus.DELETED) {
    throw new ForbiddenError("You account has been deleted.");
  }

  // ?? Check is account active ?:
  if (user.status !== UserStatus.ACTIVE) {
    throw new ForbiddenError("You account is not active yet.");
  }

  //  ?? Has any existing OTP?:
  const otp = await Otp.findOne({
    user: user?._id,
    type: OtpTypes.RESET,
  });

  if (otp) {
    checkResendCoolDown(otp.lastSentAt);
  }

  // ?? Generate a new OTP:
  const newOTP = await createOrReplaceOTP(user?._id, OtpTypes.RESET);

  sendEmail(
    user?.email,
    "Your Password Reset OTP",
    `Your password reset OTP is ${newOTP.otp}. This OTP will expire shortly. If you did not request a password reset, please ignore this email.`,
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
 * Forgot password
 */
const verifyResetPasswordOTP = async (payload: TVerifySignupOTPPayloadType) => {
  const { email, otp } = payload;

  // ?? Find User with email:
  const user = await User.findOne({
    email,
  });

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  // ?? Check  is OTP already verified:
  if (!user.isOtpVerified) {
    throw new BadRequest(
      "Your account is not verified yet. Please verify with signup OTP.",
    );
  }

  // ?? Check is account still pending?:
  if (user.status === UserStatus.PENDING) {
    throw new ForbiddenError(
      `Your account is Pending yet. Please verify your account.`,
    );
  }

  // ?? Check is account blocked:
  if (user.status === UserStatus.BLOCKED) {
    throw new ForbiddenError(`Your account is blocked.`);
  }

  // ?? Check is account deleted ?:
  if (user.status === UserStatus.DELETED) {
    throw new ForbiddenError("You account has been deleted.");
  }

  // ?? Check is account active ?:
  if (user.status !== UserStatus.ACTIVE) {
    throw new ForbiddenError("You account is not active yet.");
  }

  //  ?? Has any existing OTP?:
  const existingOTP = await Otp.findOne({
    user: user?._id,
    type: OtpTypes.RESET,
  });

  if (!existingOTP) {
    throw new BadRequest("Invalid OTP.");
  }

  if (existingOTP.expiresAt < moment().toDate()) {
    throw new BadRequest("OTP has been expired.");
  }

  // ?? Check is OTP matched:
  const isOtpMatched = await comparePassword(otp, existingOTP?.otpHash);
  if (!isOtpMatched) {
    throw new BadRequest("Invalid OTP.");
  }

  // ?? Reset Password Token Payload:
  const resetPasswordTokenPayload: IJwtUserPayload = {
    _id: user?._id?.toString(),
    email: user?.email,
    name: user?.name,
    profileImage: user?.profileImage!,
    status: user?.status,
    role: user?.role,
  };

  await Otp.deleteOne({
    user: user?._id,
    otpHash: existingOTP.otpHash,
  });

  // ?? Generate Reset password Token:
  const token = createToken(
    resetPasswordTokenPayload,
    configs.jwt.resetToken.secret,
    configs.jwt.resetToken.expiresIn,
  );

  return {
    token,
  };
};

/**
 * Reset Password:
 */

const resetPassword = async (payload: TResetPasswordPayloadType) => {
  const { token, password } = payload;

  // ?? Valid the token :
  const decode = verifyToken(token, configs.jwt.resetToken.secret);
  if (!decode.email) {
    throw new ForbiddenError("Invalid reset token.");
  }

  //  ?? Find user with this  email:
  const user = await User.findOne({
    email: decode.email,
  });

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  // ?? Check  is OTP already verified:
  if (!user.isOtpVerified) {
    throw new BadRequest(
      "Your account is not verified yet. Please verify with signup OTP.",
    );
  }

  // ?? Check is account still pending?:
  if (user.status === UserStatus.PENDING) {
    throw new ForbiddenError(
      `Your account is Pending yet. Please verify your account.`,
    );
  }

  // ?? Check is account blocked:
  if (user.status === UserStatus.BLOCKED) {
    throw new ForbiddenError(`Your account is blocked.`);
  }

  // ?? Check is account deleted ?:
  if (user.status === UserStatus.DELETED) {
    throw new ForbiddenError("You account has been deleted.");
  }

  // ?? Check is account active ?:
  if (user.status !== UserStatus.ACTIVE) {
    throw new ForbiddenError("You account is not active yet.");
  }

  // ?? Is jwt issued before password changed ?:
  if (user.isJwtIssuedBeforePasswordChanged(decode.iat as number)) {
    throw new UnauthorizedError("Token is expired. Please login");
  }

  // ?? Hash password:
  const hashedPassword = await hashPassword(
    password,
    configs.passwordSaltRound,
  );

  user.password = hashedPassword;
  user.passwordChangedAt = new Date();

  await user.save();

  return null;
};

/**
 * Change password:
 */

const changePassword = async (
  user: IUserDoc,
  payload: TChangePasswordPayload,
) => {
  const { newPassword, oldPassword } = payload;

  // ?? Compare both password:
  const isPasswordMatched = await comparePassword(oldPassword, user.password);
  if (!isPasswordMatched) {
    throw new BadRequest("Credential not matched.");
  }

  // ?? Hash password:
  const hashedPassword = await hashPassword(
    newPassword,
    configs.passwordSaltRound,
  );

  user.password = hashedPassword;
  user.passwordChangedAt = new Date();

  await user.save();

  return null;
};

// const updateUser = async (id: string, payload: TUpdateUserPayloadType) => {
//   const result = await User.findOneAndUpdate(
//     { _id: id },
//     { $set: payload },
//     { new: true },
//   );

//   if (!result) {
//     throw new AppError(httpStatus.NOT_FOUND, "User not found");
//   }

//   return result;
// };

// const getAllUser = async (query: TGetAllUserQueryParamsType) => {
//   const {
//     page = 1,
//     limit = 10,
//     searchTerm,
//     sortOrder = "desc",
//     sortBy = "createdAt",
//     fromDate,
//     toDate,
//   } = query;

//   const skip = (page - 1) * limit;
//   const pipeline: PipelineStage[] = [];

//   if (fromDate || toDate) {
//     const dateFilter: Record<string, unknown> = {};
//     if (fromDate) dateFilter.$gte = new Date(fromDate);
//     if (toDate) dateFilter.$lte = new Date(toDate);

//     pipeline.push({ $match: { createdAt: dateFilter } });
//   }

//   if (searchTerm) {
//     pipeline.push({
//       $match: {
//         $or: userSearchableFields.map((field) => ({
//           [field]: { $regex: searchTerm, $options: "i" },
//         })),
//       },
//     });
//   }

//   pipeline.push({ $sort: { [sortBy]: sortOrder === "asc" ? 1 : -1 } });

//   pipeline.push({
//     $facet: {
//       data: [{ $skip: skip }, { $limit: limit }],
//       meta: [{ $count: "total" }],
//     },
//   });

//   const aggregated = await User.aggregate(pipeline);

//   const data = aggregated?.[0]?.data || [];
//   const total = aggregated?.[0]?.meta?.[0]?.total || 0;

//   return {
//     data,
//     meta: {
//       page,
//       limit,
//       total,
//       totalPages: Math.ceil(total / limit) || 1,
//     },
//   };
// };

// const getUserById = async (id: string) => {
//   const result = await User.findById(id);

//   if (!result) {
//     throw new AppError(httpStatus.NOT_FOUND, "User not found");
//   }

//   return result;
// };

// const deleteUserById = async (id: string) => {
//   const result = await User.findOneAndDelete({ _id: id });

//   if (!result) {
//     throw new AppError(httpStatus.NOT_FOUND, "User not found");
//   }

//   return result;
// };

export const userServices = {
  createUser,
  resendSignupOTP,
  verifySignupOTP,
  login,
  forgotPassword,
  verifyResetPasswordOTP,
  resetPassword,
  changePassword,

  // ??
  // updateUser,
  // getAllUser,
  // getUserById,
  // deleteUserById,
};

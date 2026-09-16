import httpStatus from "http-status";

import {
   sendResponse,
   catchAsync,
   getUserFromRequest,
   setCookie,
} from "@/app/utils";
import type { TMulterFile } from "@/app/interfaces/multer.types";
import { authServices } from "./auth.services";

const createUser = catchAsync(async (req, res) => {
   const profileImage = req.file as TMulterFile;
   const result = await authServices.createUser(req.body, profileImage);

   sendResponse(res, {
      statusCode: httpStatus.CREATED,
      message: result?.message,
      data: result,
   });
});

const resendSignupOTP = catchAsync(async (req, res) => {
   const result = await authServices.resendSignupOTP(req.body);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "Signup OTP resend successfully.",
      data: result,
   });
});

const verifySignupOTP = catchAsync(async (req, res) => {
   const result = await authServices.verifySignupOTP(req.body);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "Signup OTP verified successfully.",
      data: result,
   });
});

const login = catchAsync(async (req, res) => {
   const result = await authServices.login(req.body);

   setCookie(res, "refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "none",
   });

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "You are logged in successfully.",
      data: result,
   });
});

const forgotPassword = catchAsync(async (req, res) => {
   const result = await authServices.forgotPassword(req.body);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "Password reset OTP has been sent to your email.",
      data: result,
   });
});

const verifyResetPasswordOTP = catchAsync(async (req, res) => {
   const result = await authServices.verifyResetPasswordOTP(req.body);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "OTP verified successfully.",
      data: result,
   });
});

const resetPassword = catchAsync(async (req, res) => {
   const result = await authServices.resetPassword(req.body);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "Password has been reset successfully.",
      data: result,
   });
});

const changePassword = catchAsync(async (req, res) => {
   const user = await getUserFromRequest(req);
   const result = await authServices.changePassword(user, req.body);

   setCookie(res, "refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "none",
   });

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "Password has been updated.",
      data: result,
   });
});

const refreshToken = catchAsync(async (req, res) => {
   const refreshToken = req?.cookies?.refreshToken || req?.body?.refreshToken;

   const result = await authServices.refreshToken(refreshToken);

   setCookie(res, "refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "none",
   });

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "Access token is retrieved successfully.",
      data: result,
   });
});

export const authControllers = {
   // Signup
   createUser,
   resendSignupOTP,
   verifySignupOTP,

   // Sign In:
   login,

   // Reset password
   forgotPassword,
   verifyResetPasswordOTP,
   resetPassword,
   changePassword,
   refreshToken,
};

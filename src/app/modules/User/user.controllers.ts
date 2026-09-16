import httpStatus from "http-status";
import { userServices } from "./user.services";
import {
   sendResponse,
   catchAsync,
   getUserFromRequest,
   setCookie,
} from "@/app/utils";
import type { TMulterFile } from "@/app/interfaces/multer.types";

const createUser = catchAsync(async (req, res) => {
   const profileImage = req.file as TMulterFile;
   const result = await userServices.createUser(req.body, profileImage);

   sendResponse(res, {
      statusCode: httpStatus.CREATED,
      message: result?.message,
      data: result,
   });
});

const resendSignupOTP = catchAsync(async (req, res) => {
   const result = await userServices.resendSignupOTP(req.body);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "Signup OTP resend successfully.",
      data: result,
   });
});

const verifySignupOTP = catchAsync(async (req, res) => {
   const result = await userServices.verifySignupOTP(req.body);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "Signup OTP verified successfully.",
      data: result,
   });
});

const login = catchAsync(async (req, res) => {
   const result = await userServices.login(req.body);

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
   const result = await userServices.forgotPassword(req.body);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "Password reset OTP has been sent to your email.",
      data: result,
   });
});

const verifyResetPasswordOTP = catchAsync(async (req, res) => {
   const result = await userServices.verifyResetPasswordOTP(req.body);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "OTP verified successfully.",
      data: result,
   });
});

const resetPassword = catchAsync(async (req, res) => {
   const result = await userServices.resetPassword(req.body);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "Password has been reset successfully.",
      data: result,
   });
});

const changePassword = catchAsync(async (req, res) => {
   const user = await getUserFromRequest(req);
   const result = await userServices.changePassword(user, req.body);

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

   const result = await userServices.refreshToken(refreshToken);

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

// const updateUser = catchAsync(async (req, res) => {
//   const result = await userServices.updateUser(
//     req.params.id as string,
//     req.body,
//   );

//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     message: "The user updated successfully!",
//     data: result,
//   });
// });

// const getAllUser = catchAsync(async (req, res) => {
//   const result = await userServices.getAllUser(req.query);

//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     message: "The user retrieved successfully!",
//     data: result.data,
//     meta: result.meta,
//   });
// });

// const getUserById = catchAsync(async (req, res) => {
//   const result = await userServices.getUserById(req.params.id as string);

//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     message: "The user retrieved successfully!",
//     data: result,
//   });
// });

// const deleteUserById = catchAsync(async (req, res) => {
//   const result = await userServices.deleteUserById(req.params.id as string);

//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     message: "The user deleted successfully!",
//     data: result,
//   });
// });

export const userControllers = {
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

   // updateUser,
   // getAllUser,
   // getUserById,
   // deleteUserById,
};

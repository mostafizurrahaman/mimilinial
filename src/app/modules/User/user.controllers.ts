import httpStatus from "http-status";
import { userServices } from "./user.services";
import { sendResponse, catchAsync, getUserFromRequest } from "@/app/utils";
import type { TGetAllUserQueryParamsType } from "./user.validations";

const getMe = catchAsync(async (req, res) => {
   const user = await getUserFromRequest(req);
   const result = await userServices.getMe(user);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "User profile is retrieved successfully.",
      data: result,
   });
});

const updateUserStatus = catchAsync(async (req, res) => {
   const user = await getUserFromRequest(req);
   const userId = req.params.id as string;

   const result = await userServices.updateUserStatus(user, userId, req.body);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: result.message || "User status updated successfully.",
      data: null,
   });
});

const getAllUser = catchAsync(async (req, res) => {
   const user = await getUserFromRequest(req);
   const result = await userServices.getAllUser(
      user,
      req.validQuery as TGetAllUserQueryParamsType,
   );

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The user retrieved successfully!",
      data: result.data,
      meta: result.meta,
   });
});

const getUserById = catchAsync(async (req, res) => {
   const result = await userServices.getUserById(req.params.id as string);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The user retrieved successfully!",
      data: result,
   });
});

const deleteUserById = catchAsync(async (req, res) => {
   const result = await userServices.deleteUserById(req.params.id as string);

   sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "The user deleted successfully!",
      data: result,
   });
});

export const userControllers = {
   getMe,
   updateUserStatus,
   getAllUser,
   getUserById,
   deleteUserById,
};

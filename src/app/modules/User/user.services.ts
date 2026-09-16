import httpStatus from "http-status";
import type { PipelineStage } from "mongoose";
import type {
   TGetAllUserQueryParamsType,
   TUserStatusPayloadType,
} from "./user.validations";
import { AppError, BadRequest, NotFoundError } from "@/app/errors";
import { User } from "./user.model";
import {
   UserAccessLevel,
   UserRoles,
   userSearchableFields,
   UserStatus,
} from "./user.constants";
import type { IUserDoc } from "./user.interfaces";

const getMe = async (user: IUserDoc) => {
   return {
      userId: user?._id,
      name: user?.name,
      email: user?.email,
      phone: user?.phone,
      role: user?.role,
      status: user?.status,
      profileImage: user?.profileImage,
      isOtpVerified: user?.isOtpVerified,
      authProviders: user?.authProviders,
      isTwoFactorEnabled: user?.isTwoFactorEnabled,
      createdAt: user?.createdAt,
      updatedAt: user?.updatedAt,
   };
};

const updateUserStatus = async (
   user: IUserDoc,
   targetUserId: string,
   payload: TUserStatusPayloadType,
) => {
   const { status, reason } = payload;
   // Check if the target user exists
   const targetUser = await User.findById(targetUserId);

   if (!targetUser) {
      throw new NotFoundError("Target user not found.");
   }

   // Prevent users from updating their own status
   if (targetUser._id.toString() === user._id.toString()) {
      throw new BadRequest("You cannot update your own status.");
   }

   // Get access levels for both users
   const actorUserAccessLevel = UserAccessLevel?.[user?.role];
   const targetUserAccessLevel = UserAccessLevel?.[targetUser?.role];

   // Ensure the actor has a higher access level than the target user
   if (actorUserAccessLevel <= targetUserAccessLevel) {
      throw new BadRequest(
         "You do not have permission to update this user's status.",
      );
   }

   // Check  is user status is pending?
   if (
      targetUser.status === UserStatus.PENDING ||
      targetUser.status === UserStatus.DELETED
   ) {
      throw new BadRequest(
         `You do not update ${targetUser.status} user's status.`,
      );
   }

   // Check if the user's status is already the requested status
   if (targetUser.status === status) {
      throw new BadRequest(`User is already ${status.toLowerCase()}.`);
   }

   targetUser.status = status;

   if (targetUser.status === UserStatus.BLOCKED) {
      targetUser.blockedReason = reason as string;
      targetUser.blockedAt = new Date();
   } else {
      targetUser.blockedReason = null;
      targetUser.blockedAt = null;
   }

   await targetUser.save();

   return {
      message:
         targetUser?.status === UserStatus.ACTIVE
            ? "User has been activated successfully."
            : "User has been blocked successfully. ",
   };
};

const getAllUser = async (query: TGetAllUserQueryParamsType) => {
   const {
      page = 1,
      limit = 10,
      searchTerm,
      sortOrder = "desc",
      sortBy = "createdAt",
      fromDate,
      toDate,
   } = query;

   const skip = (page - 1) * limit;
   const pipeline: PipelineStage[] = [];

   if (fromDate || toDate) {
      const dateFilter: Record<string, unknown> = {};
      if (fromDate) dateFilter.$gte = new Date(fromDate);
      if (toDate) dateFilter.$lte = new Date(toDate);

      pipeline.push({ $match: { createdAt: dateFilter } });
   }

   if (searchTerm) {
      pipeline.push({
         $match: {
            $or: userSearchableFields.map((field) => ({
               [field]: { $regex: searchTerm, $options: "i" },
            })),
         },
      });
   }

   pipeline.push({ $sort: { [sortBy]: sortOrder === "asc" ? 1 : -1 } });

   pipeline.push({
      $facet: {
         data: [{ $skip: skip }, { $limit: limit }],
         meta: [{ $count: "total" }],
      },
   });

   const aggregated = await User.aggregate(pipeline);

   const data = aggregated?.[0]?.data || [];
   const total = aggregated?.[0]?.meta?.[0]?.total || 0;

   return {
      data,
      meta: {
         page,
         limit,
         total,
         totalPages: Math.ceil(total / limit) || 1,
      },
   };
};

const getUserById = async (id: string) => {
   const result = await User.findById(id);

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found");
   }

   return result;
};

const deleteUserById = async (id: string) => {
   const result = await User.findOneAndDelete({ _id: id });

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found");
   }

   return result;
};

export const userServices = {
   getMe,
   updateUserStatus,
   getAllUser,
   getUserById,
   deleteUserById,
};

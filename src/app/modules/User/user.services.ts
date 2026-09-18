import httpStatus from "http-status";
import type {
   TGetAllUserQueryParamsType,
   TUserStatusPayloadType,
} from "./user.validations";
import { AppError, BadRequest, NotFoundError } from "@/app/errors";
import { UserAccessLevel, UserStatus } from "./user.constants";
import { formatQuery } from "@/app/utils";
import { db } from "@/app/db";
import { users, type IUser } from "@/app/db/schemas";
import {
   eq,
   ne,
   and,
   or,
   ilike,
   gte,
   lte,
   asc,
   desc,
   count,
   SQL,
} from "drizzle-orm";

const getMe = async (user: IUser) => {
   return {
      userId: user?.id,
      name: user?.name,
      email: user?.email,
      phone: user?.phone,
      role: user?.role,
      status: user?.status,
      profileImage: user?.profileImage,
      isOtpVerified: user?.isOtpVerified,
      authProvider: user?.authProvider,
      isTwoFactorEnabled: user?.isTwoFactorEnabled,
   };
};

const updateUserStatus = async (
   user: IUser,
   targetUserId: string,
   payload: TUserStatusPayloadType,
) => {
   const { status, reason } = payload;

   const targetUser = await db.query.users.findFirst({
      where: { id: targetUserId },
   });

   if (!targetUser) {
      throw new NotFoundError("Target user not found.");
   }

   if (targetUser.id === user.id) {
      throw new BadRequest("You cannot update your own status.");
   }

   const actorLevel =
      UserAccessLevel[user?.role as keyof typeof UserAccessLevel] ?? 0;
   const targetLevel =
      UserAccessLevel[targetUser?.role as keyof typeof UserAccessLevel] ?? 0;

   if (actorLevel <= targetLevel) {
      throw new BadRequest(
         "You do not have permission to update this user's status.",
      );
   }

   if (
      targetUser.status === UserStatus.PENDING ||
      targetUser.status === UserStatus.DELETED
   ) {
      throw new BadRequest(
         `You do not update ${targetUser.status} user's status.`,
      );
   }

   if (targetUser.status === status) {
      throw new BadRequest(`User is already ${status.toLowerCase()}.`);
   }

   const updatePayload: Partial<typeof users.$inferInsert> = { status };
   if (status === UserStatus.BLOCKED) {
      updatePayload.blockedReason = reason as string;
      updatePayload.blockedAt = new Date();
   } else {
      updatePayload.blockedReason = null;
      updatePayload.blockedAt = null;
   }

   await db.update(users).set(updatePayload).where(eq(users.id, targetUserId));

   return {
      message:
         status === UserStatus.ACTIVE
            ? "User has been activated successfully."
            : "User has been blocked successfully.",
   };
};

const getAllUser = async (user: IUser, query: TGetAllUserQueryParamsType) => {
   const {
      page,
      limit,
      skip,
      searchTerm,
      sortOrder,
      sortBy,
      fromDate,
      toDate,
   } = formatQuery(query, [
      "createdAt",
      "updatedAt",
      "name",
      "email",
      "role",
      "status",
   ]);

   const conditions: (SQL | undefined)[] = [];

   if (user?.id) {
      conditions.push(ne(users.id, user.id));
   }

   if (fromDate) {
      conditions.push(gte(users.lastActivityAt, new Date(fromDate)));
   }
   if (toDate) {
      conditions.push(lte(users.lastActivityAt, new Date(toDate)));
   }

   if (searchTerm) {
      conditions.push(
         or(
            ilike(users.name, `%${searchTerm}%`),
            ilike(users.email, `%${searchTerm}%`),
            ilike(users.phone, `%${searchTerm}%`),
         ),
      );
   }

   const whereClause =
      conditions.length > 0
         ? and(...(conditions.filter(Boolean) as SQL[]))
         : undefined;
   const direction: "asc" | "desc" = sortOrder === 1 ? "asc" : "desc";

   const orderBy =
      sortBy === "name"
         ? { name: direction }
         : sortBy === "email"
           ? { email: direction }
           : sortBy === "role"
             ? { role: direction }
             : sortBy === "status"
               ? { status: direction }
               : { lastActivityAt: direction };

   const [rawData, [countResult]] = await Promise.all([
      db.query.users.findMany({
         where: whereClause ? { RAW: whereClause } : undefined,
         orderBy,
         limit,
         offset: skip,
      }),
      db.select({ total: count() }).from(users).where(whereClause),
   ]);

   const data = rawData.map((u) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: u.status,
      profileImage: u.profileImage,
      isOtpVerified: u.isOtpVerified,
      authProvider: u.authProvider,
      isTwoFactorEnabled: u.isTwoFactorEnabled,
   }));

   const total = countResult?.total ?? 0;

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
   const result = await db.query.users.findFirst({
      where: { id },
   });

   if (!result) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found");
   }

   return result;
};

const deleteUserById = async (id: string) => {
   const [result] = await db.delete(users).where(eq(users.id, id)).returning();

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

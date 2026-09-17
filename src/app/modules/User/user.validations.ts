import {
   optionalNumber,
   optionalEnumString,
   optionalString,
   optionalDate,
   requiredString,
   enumString,
   requiredMongooseId,
} from "@/app/utils/zod";
import {
   userRoleValues,
   userSortableFields,
   UserStatus,
   userStatusValues,
} from "./user.constants";
import { sortOrderValues } from "@/app/constants";
import z from "zod";

const updateUserStatusSchema = z.object({
   params: z.object({
      id: requiredMongooseId("ID"),
   }),
   body: z.object({
      status: enumString([UserStatus.BLOCKED, UserStatus.ACTIVE], "Status"),
      reason: optionalString("Reason").nullish(),
   }),
});

const getAllUserSchema = z.object({
   query: z.object({
      page: optionalNumber("Page"),
      limit: optionalNumber("Limit"),
      searchTerm: optionalString("Search term"),
      sortOrder: optionalEnumString(sortOrderValues, "Sort order"),
      sortBy: optionalEnumString(userSortableFields, "Sort by"),
      fromDate: optionalDate("From date"),
      toDate: optionalDate("To date"),
      status: enumString(userStatusValues, "User status"),
      role: enumString(userRoleValues, "Role"),
   }),
});

const getUserByIdSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
});

const deleteUserByIdSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
});

export const userValidations = {
   updateUserSchema: z.compile(updateUserStatusSchema),
   getAllUserSchema: z.compile(getAllUserSchema),
   getUserByIdSchema: z.compile(getUserByIdSchema),
   deleteUserByIdSchema: z.compile(deleteUserByIdSchema),
};

export type TUserStatusPayloadType = z.infer<
   typeof updateUserStatusSchema.shape.body
>;
export type TGetAllUserQueryParamsType = z.infer<
   typeof getAllUserSchema.shape.query
>;
export type TGetUserByIdParamsType = z.infer<
   typeof getUserByIdSchema.shape.params
>;
export type TDeleteUserByIdParamsType = z.infer<
   typeof deleteUserByIdSchema.shape.params
>;

import {
   optionalNumber,
   optionalEnumString,
   optionalString,
   optionalDate,
   requiredString,
} from "@/app/utils/zod";
import { userSortableFields } from "./user.constants";
import { sortOrderValues } from "@/app/constants";
import z from "zod";

const updateUserSchema = z.object({
   params: z.object({
      id: requiredString("ID"),
   }),
   body: z.object({}),
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
   updateUserSchema,
   getAllUserSchema,
   getUserByIdSchema,
   deleteUserByIdSchema,
};

export type TUpdateUserPayloadType = z.infer<
   typeof updateUserSchema.shape.body
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

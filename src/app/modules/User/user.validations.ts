import {
  optionalNumber,
  optionalEnumString,
  optionalString,
  optionalDate,
  requiredEmail,
  requiredString,
} from "@/app/utils/zod";
import { userSortableFields } from "./user.constants";
import { bdPhoneRegex, sortOrderValues } from "@/app/constants";
import { configs } from "@/app/configs";
import z from "zod";

const createUserSchema = z.object({
  body: z.object({
    name: requiredString("Name"),
    email: requiredEmail("Email"),
    phone: requiredString("Phone").regex(bdPhoneRegex, {
      error: "Provide a valid bangladeshi number.",
    }),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/\d/, "Password must contain a number")
      .regex(/[@$!%*?&]/, "Password must contain a special character"),
  }),
});

const resendSignupOTPSchema = z.object({
  body: z.object({
    email: requiredEmail("Email"),
  }),
});

const verifySignupOTPSchema = z.object({
  body: z.object({
    email: requiredEmail("Email"),
    otp: z
      .string({
        error: "OTP is required.",
      })
      .length(configs.otpSettings.digits || 6, {
        message: "OTP must be exactly 6 digits",
      })
      .regex(/^\d+$/, { message: "OTP must contain only numbers" }),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: requiredEmail("Email"),
    password: requiredString("Password"),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: requiredEmail("Email"),
  }),
});

const verifyResetPasswordOTPSchema = z.object({
  body: z.object({
    email: requiredEmail("Email"),
    otp: z
      .string({
        error: "OTP is required.",
      })
      .length(configs.otpSettings.digits || 6, {
        message: "OTP must be exactly 6 digits",
      })
      .regex(/^\d+$/, { message: "OTP must contain only numbers" }),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: requiredString("Token"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/\d/, "Password must contain a number")
      .regex(/[@$!%*?&]/, "Password must contain a special character"),
  }),
});

const changePasswordSchema = z.object({
  body: z
    .object({
      oldPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[a-z]/, "Password must contain a lowercase letter")
        .regex(/[A-Z]/, "Password must contain an uppercase letter")
        .regex(/\d/, "Password must contain a number")
        .regex(/[@$!%*?&]/, "Password must contain a special character"),
      newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[a-z]/, "Password must contain a lowercase letter")
        .regex(/[A-Z]/, "Password must contain an uppercase letter")
        .regex(/\d/, "Password must contain a number")
        .regex(/[@$!%*?&]/, "Password must contain a special character"),
    })
    .superRefine((data, ctx) => {
      if (data.oldPassword === data.newPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["oldPassword"],
          message: "You cannot reuse same password.",
        });
      }
    }),
});

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
  createUserSchema,
  resendSignupOTPSchema,
  verifySignupOTPSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyResetPasswordOTPSchema,
  resetPasswordSchema,
  changePasswordSchema,

  updateUserSchema,
  getAllUserSchema,
  getUserByIdSchema,
  deleteUserByIdSchema,
};

export type TCreateUserPayloadType = z.infer<
  typeof createUserSchema.shape.body
>;
export type TResendSignupOTPPayloadType = z.infer<
  typeof resendSignupOTPSchema.shape.body
>;
export type TVerifySignupOTPPayloadType = z.infer<
  typeof verifySignupOTPSchema.shape.body
>;
export type TLoginPayloadType = z.infer<typeof loginSchema.shape.body>;
export type TForgotPasswordPayloadType = z.infer<
  typeof forgotPasswordSchema.shape.body
>;
export type TVerifyResetPasswordOTPType = z.infer<
  typeof verifyResetPasswordOTPSchema.shape.body
>;
export type TResetPasswordPayloadType = z.infer<
  typeof resetPasswordSchema.shape.body
>;
export type TChangePasswordPayload = z.infer<
  typeof changePasswordSchema.shape.body
>;

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

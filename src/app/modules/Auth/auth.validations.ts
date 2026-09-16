import {
   optionalNumber,
   optionalEnumString,
   optionalString,
   optionalDate,
   requiredEmail,
   requiredString,
} from "@/app/utils/zod";
import { bdPhoneRegex, sortOrderValues } from "@/app/constants";
import { configs } from "@/app/configs";
import z from "zod";
import { userSortableFields } from "../User";

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

const refreshTokenSchema = z
   .object({
      cookies: z
         .object({
            refreshToken: optionalString("Refresh token").nullish(),
         })
         .nullish()
         .optional(),
      body: z
         .object({
            refreshToken: optionalString("Refresh token").nullish(),
         })
         .nullish()
         .optional(),
   })
   .superRefine((data, ctx) => {
      if (!data?.cookies?.refreshToken && !data?.body?.refreshToken) {
         ctx.addIssue({
            code: "custom",
            message: "Refresh token is missing.",
            path: ["cookies", "refreshToken"],
         });
      }
   });

export const authValidations = {
   createUserSchema,
   resendSignupOTPSchema,
   verifySignupOTPSchema,
   loginSchema,
   forgotPasswordSchema,
   verifyResetPasswordOTPSchema,
   resetPasswordSchema,
   changePasswordSchema,
   refreshTokenSchema,
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
export type TRefreshTokenPayload =
   | z.infer<typeof refreshTokenSchema.shape.cookies>
   | z.infer<typeof refreshTokenSchema.shape.body>;

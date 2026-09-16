import express, { Router } from "express";
import { validateRequest } from "@/app/middlewares/validate-request";
import { auth } from "@/app/middlewares/auth";
import { multerFactory } from "@/app/utils/multer";
import { authValidations } from "./auth.validations";
import { authControllers } from "./auth.controllers";

const router: Router = express.Router();

router.post(
   "/signup",
   multerFactory({
      category: "image",
      maxSizeInMB: 10,
   }).single("profileImage"),
   validateRequest(authValidations.createUserSchema),
   authControllers.createUser,
);

router.post(
   "/resend-signup-otp",
   validateRequest(authValidations.resendSignupOTPSchema),
   authControllers.resendSignupOTP,
);

router.post(
   "/verify-signup-otp",
   validateRequest(authValidations.verifySignupOTPSchema),
   authControllers.verifySignupOTP,
);

router.post(
   "/login",
   validateRequest(authValidations.loginSchema),
   authControllers.login,
);

router.post(
   "/forgot-password",
   validateRequest(authValidations.forgotPasswordSchema),
   authControllers.forgotPassword,
);

router.post(
   "/verify-reset-otp",
   validateRequest(authValidations.verifyResetPasswordOTPSchema),
   authControllers.verifyResetPasswordOTP,
);

router.post(
   "/reset-password",
   validateRequest(authValidations.resetPasswordSchema),
   authControllers.resetPassword,
);

router.post(
   "/change-password",
   auth(),
   validateRequest(authValidations.changePasswordSchema),
   authControllers.changePassword,
);

router.post(
   "/refresh-token",
   validateRequest(authValidations.refreshTokenSchema),
   authControllers.refreshToken,
);

export const authRoutes = router;

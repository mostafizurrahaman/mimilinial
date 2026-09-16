import express, { Router } from "express";
import { userControllers } from "./user.controllers";
import { userValidations } from "./user.validations";
import { validateRequest } from "@/app/middlewares/validate-request";
import { auth } from "@/app/middlewares/auth";
import { UserRoles } from "./user.constants";
import { multerFactory } from "@/app/utils/multer";

const router: Router = express.Router();

router.post(
   "/signup",
   multerFactory({
      category: "image",
      maxSizeInMB: 10,
   }).single("profileImage"),
   validateRequest(userValidations.createUserSchema),
   userControllers.createUser,
);

router.post(
   "/resend-signup-otp",
   validateRequest(userValidations.resendSignupOTPSchema),
   userControllers.resendSignupOTP,
);

router.post(
   "/verify-signup-otp",
   validateRequest(userValidations.verifySignupOTPSchema),
   userControllers.verifySignupOTP,
);

router.post(
   "/login",
   validateRequest(userValidations.loginSchema),
   userControllers.login,
);

router.post(
   "/forgot-password",
   validateRequest(userValidations.forgotPasswordSchema),
   userControllers.forgotPassword,
);

router.post(
   "/verify-reset-otp",
   validateRequest(userValidations.verifyResetPasswordOTPSchema),
   userControllers.verifyResetPasswordOTP,
);

router.post(
   "/reset-password",
   validateRequest(userValidations.resetPasswordSchema),
   userControllers.resetPassword,
);

router.post(
   "/change-password",
   auth(),
   validateRequest(userValidations.changePasswordSchema),
   userControllers.changePassword,
);

router.post(
   "/refresh-token",
   validateRequest(userValidations.refreshTokenSchema),
   userControllers.refreshToken,
);

// router.patch(
//   "/:id",
//   validateRequest(userValidations.updateUserSchema),
//   userControllers.updateUser,
// );

// router.get(
//   "/all",
//   validateRequest(userValidations.getAllUserSchema),
//   userControllers.getAllUser,
// );

// router.get(
//   "/:id",
//   validateRequest(userValidations.getUserByIdSchema),
//   userControllers.getUserById,
// );

// router.delete(
//   "/:id",
//   validateRequest(userValidations.deleteUserByIdSchema),
//   userControllers.deleteUserById,
// );

export const userRoutes = router;

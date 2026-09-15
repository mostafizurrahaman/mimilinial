import express, { Router } from "express";
import { userControllers } from "./user.controllers";
import { userValidations } from "./user.validations";
import { validateRequest } from "../../middlewares";
import { auth } from "../../middlewares/auth";
import { UserRoles } from "./user.constants";
import { multerFactory } from "../../utils";
import { validate } from "zod";

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

router.patch(
  "/:id",
  validateRequest(userValidations.updateUserSchema),
  userControllers.updateUser,
);

router.get(
  "/all",
  validateRequest(userValidations.getAllUserSchema),
  userControllers.getAllUser,
);

router.get(
  "/:id",
  validateRequest(userValidations.getUserByIdSchema),
  userControllers.getUserById,
);

router.delete(
  "/:id",
  validateRequest(userValidations.deleteUserByIdSchema),
  userControllers.deleteUserById,
);

export const userRoutes = router;

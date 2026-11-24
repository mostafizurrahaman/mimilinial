import express, { Router } from "express";
import { userMasteryControllers } from "./user-mastery.controllers";
import { userMasteryValidations } from "./user-mastery.validations";
import { validateRequest } from "../../middlewares";
import { auth } from "@/app/middlewares/auth";
import { UserRoles } from "../User";

const router: Router = express.Router();

/**
 * -------------------------------------------------------------------------
 * USER MASTERY & PERFORMANCE TRACKER ROUTES
 * -------------------------------------------------------------------------
 */

// 1. Weak Topics (Accuracy < 60%)
router.get(
  "/weak-topics",
  auth(UserRoles.USER, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(userMasteryValidations.getWeakTopicsSchema),
  userMasteryControllers.getWeakTopics,
);

// 2. Strong Topics (Accuracy >= 75%)
router.get(
  "/strong-topics",
  auth(UserRoles.USER, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(userMasteryValidations.getStrongTopicsSchema),
  userMasteryControllers.getStrongTopics,
);

// 3. Overall Mastery Overview Dashboard
router.get(
  "/overview",
  auth(UserRoles.USER, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  userMasteryControllers.getMasteryOverview,
);

// 4. Subject-Specific Topics Mastery Details
router.get(
  "/subject/:subjectId",
  auth(UserRoles.USER, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(userMasteryValidations.getSubjectMasterySchema),
  userMasteryControllers.getSubjectMasteryDetails,
);

export const userMasteryRoutes = router;

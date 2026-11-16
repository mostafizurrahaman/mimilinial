import express, { Router } from "express";
import { examControllers } from "./exam.controllers";
import { examValidations } from "./exam.validations";
import { validateRequest } from "../../middlewares";
import { auth } from "@/app/middlewares/auth";
import { UserRoles } from "../User";

const router: Router = express.Router();

/**
 * -------------------------------------------------------------------------
 * EXAM MANAGEMENT ROUTES
 * -------------------------------------------------------------------------
 */

// 1. CREATE EXAM
router.post(
  "/",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examValidations.createExamSchema),
  examControllers.createExam,
);

// 2. UPDATE EXAM
router.patch(
  "/:id",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examValidations.updateExamSchema),
  examControllers.updateExam,
);

// 3. GET ALL EXAM
router.get(
  "/all",
  validateRequest(examValidations.getAllExamSchema),
  examControllers.getAllExam,
);

// 4. GET EXAM BY ID OR SLUG
router.get(
  "/:id",
  validateRequest(examValidations.getExamByIdSchema),
  examControllers.getExamById,
);

// 5. DELETE EXAM BY ID
router.delete(
  "/:id",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examValidations.deleteExamByIdSchema),
  examControllers.deleteExamById,
);

export const examRoutes = router;

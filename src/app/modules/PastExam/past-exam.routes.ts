import express, { Router } from "express";
import { pastExamControllers } from "./past-exam.controllers";
import { pastExamValidations } from "./past-exam.validations";
import { validateRequest } from "../../middlewares";
import { UserRoles } from "../User";
import { auth } from "@/app/middlewares/auth";

const router: Router = express.Router();

/**
 * -------------------------------------------------------------------------
 * PAST EXAM MANAGEMENT ROUTES
 * -------------------------------------------------------------------------
 */

// 1. CREATE PAST EXAM
router.post(
  "/",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(pastExamValidations.createPastExamSchema),
  pastExamControllers.createPastExam,
);

// 2. UPDATE PAST EXAM
router.patch(
  "/:id",
  validateRequest(pastExamValidations.updatePastExamSchema),
  pastExamControllers.updatePastExam,
);

// 3. GET ALL PAST EXAM
router.get(
  "/all",
  validateRequest(pastExamValidations.getAllPastExamSchema),
  pastExamControllers.getAllPastExam,
);

// 4. GET PAST EXAM BY ID
router.get(
  "/:id",
  validateRequest(pastExamValidations.getPastExamByIdSchema),
  pastExamControllers.getPastExamById,
);

// 5. DELETE PAST EXAM BY ID
router.delete(
  "/:id",
  validateRequest(pastExamValidations.deletePastExamByIdSchema),
  pastExamControllers.deletePastExamById,
);

export const pastExamRoutes = router;

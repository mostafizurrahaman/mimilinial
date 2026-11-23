import express, { Router } from "express";
import { examResultControllers } from "./exam-result.controllers";
import { examResultValidations } from "./exam-result.validations";
import { validateRequest } from "../../middlewares";
import { auth } from "@/app/middlewares/auth";
import { UserRoles } from "../User";

const router: Router = express.Router();

/**
 * -------------------------------------------------------------------------
 * EXAM RESULT ROUTES
 * -------------------------------------------------------------------------
 */

// 1. Get My Results
router.get(
  "/my-results",
  auth(UserRoles.USER, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examResultValidations.getMyResultsSchema),
  examResultControllers.getMyResults,
);

// 2. Get Global Leaderboard (Overall / Weekly / Monthly / Collection)
router.get(
  "/leaderboard/global",
  auth(UserRoles.USER, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examResultValidations.getGlobalLeaderboardSchema),
  examResultControllers.getGlobalLeaderboard,
);

// 3. Get Exam-Specific Leaderboard
router.get(
  "/leaderboard/:examId",
  auth(UserRoles.USER, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examResultValidations.getExamLeaderboardSchema),
  examResultControllers.getExamLeaderboard,
);

// 3. Get Result by Attempt ID
router.get(
  "/attempt/:attemptId",
  auth(UserRoles.USER, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examResultValidations.getExamResultByAttemptIdSchema),
  examResultControllers.getResultByAttemptId,
);

// 4. Get All Exam Results (Admin)
router.get(
  "/all",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examResultValidations.getAllExamResultsSchema),
  examResultControllers.getAllExamResults,
);

// 5. Calculate and Assign Live Exam Ranks (Admin)
router.patch(
  "/assign-ranks/:examId",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  examResultControllers.calculateAndAssignLiveExamRanks,
);

// 6. Get Result by ID
router.get(
  "/:id",
  auth(UserRoles.USER, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examResultValidations.getExamResultByIdSchema),
  examResultControllers.getResultById,
);

export const examResultRoutes = router;

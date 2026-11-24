import express, { Router } from "express";
import { examAttemptControllers } from "./exam-attempt.controllers";
import { examAttemptValidations } from "./exam-attempt.validations";
import { validateRequest } from "../../middlewares";
import { auth } from "@/app/middlewares/auth";
import { UserRoles } from "../User";

const router: Router = express.Router();

/**
 * -------------------------------------------------------------------------
 * STUDENT LIVE EXAM & SESSION ROUTES
 * -------------------------------------------------------------------------
 */

// 1. Start Official Exam
router.post(
  "/start/:examId",
  auth(UserRoles.USER, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examAttemptValidations.startOfficialExamSchema),
  examAttemptControllers.startOfficialExam,
);

// 2. Start Self Practice Quiz
router.post(
  "/self-practice",
  auth(UserRoles.USER, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examAttemptValidations.startSelfPracticeExamSchema),
  examAttemptControllers.startSelfPracticeExam,
);

// 3. Resume Active Attempt
router.get(
  "/:id/resume",
  auth(UserRoles.USER, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examAttemptValidations.getAttemptByIdSchema),
  examAttemptControllers.resumeActiveAttempt,
);

// 4. Real-time Answer Sync
router.patch(
  "/:id/sync-answer",
  auth(UserRoles.USER, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examAttemptValidations.syncAnswerSchema),
  examAttemptControllers.syncAnswer,
);

// 5. Log Anti-Cheating Tab Switch
router.post(
  "/:id/log-tab-switch",
  auth(UserRoles.USER, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examAttemptValidations.logTabSwitchSchema),
  examAttemptControllers.logTabSwitch,
);

// 6. Submit Exam
router.post(
  "/:id/submit",
  auth(UserRoles.USER, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examAttemptValidations.submitExamSchema),
  examAttemptControllers.submitExam,
);

// 7. My Exam Attempts
router.get(
  "/my-attempts",
  auth(UserRoles.USER, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examAttemptValidations.getAllExamAttemptSchema),
  examAttemptControllers.getMyAttempts,
);

// 8. Review Answer Script
router.get(
  "/:id/review",
  auth(UserRoles.USER, UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examAttemptValidations.getAttemptByIdSchema),
  examAttemptControllers.reviewAnswerScript,
);

/**
 * -------------------------------------------------------------------------
 * ADMIN MONITORING & AUDIT ROUTES
 * -------------------------------------------------------------------------
 */

// 9. Get All Attempts (Admin)
router.get(
  "/",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examAttemptValidations.getAllExamAttemptSchema),
  examAttemptControllers.getAllExamAttempt,
);

// 10. Cancel / Disqualify Attempt (Admin)
router.patch(
  "/:id/cancel",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examAttemptValidations.cancelAttemptSchema),
  examAttemptControllers.cancelAttempt,
);

export const examAttemptRoutes = router;

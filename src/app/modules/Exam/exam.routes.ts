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

// 1. CREATE EXAM ROUTES (BY LEVEL)
// 1.1 Category Level Exam (also accessible at root POST /)
router.post(
  "/",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examValidations.createCategoryLevelExamSchema),
  examControllers.createCategoryExam,
);

router.post(
  "/category",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examValidations.createCategoryLevelExamSchema),
  examControllers.createCategoryExam,
);

// 1.2 Track Level Exam
router.post(
  "/track",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examValidations.createTrackLevelExamSchema),
  examControllers.createTrackExam,
);

// 1.3 Subject Level Exam
router.post(
  "/subject",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examValidations.createSubjectLevelExamSchema),
  examControllers.createSubjectExam,
);

// 1.4 Topic Level Exam
router.post(
  "/topic",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examValidations.createTopicLevelExamSchema),
  examControllers.createTopicExam,
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

// 6. MARK AS PUBLISHED
router.patch(
  "/:id/published",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examValidations.markExamAsPublishedSchema),
  examControllers.markAsPublished,
);

// 7. MARK AS ARCHIVED
router.patch(
  "/:id/archived",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examValidations.markExamAsArchivedSchema),
  examControllers.markAsArchived,
);

// 8. MARK AS DRAFT (UNPUBLISH)
router.patch(
  "/:id/draft",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(examValidations.markExamAsDraftSchema),
  examControllers.markAsDraft,
);

export const examRoutes = router;

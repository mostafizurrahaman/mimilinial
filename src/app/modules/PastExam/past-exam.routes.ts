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

// 2. MARK AS PUBLISHED
router.patch(
  "/:id/published",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(pastExamValidations.markPastExamAsPublishedSchema),
  pastExamControllers.markAsPublished,
);

// 3. MARK AS ARCHIVED
router.patch(
  "/:id/archived",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(pastExamValidations.markPastExamAsArchivedSchema),
  pastExamControllers.markAsArchived,
);

// 4. UPDATE PAST EXAM
router.patch(
  "/:id",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(pastExamValidations.updatePastExamSchema),
  pastExamControllers.updatePastExam,
);

// 5. GET ALL PAST EXAM
router.get(
  "/all",
  validateRequest(pastExamValidations.getAllPastExamSchema),
  pastExamControllers.getAllPastExam,
);

// 6. GET ALL PUBLISHED PAST EXAM
router.get(
  "/published",
  validateRequest(pastExamValidations.getAllPublishedPastExamSchema),
  pastExamControllers.getAllPublishedPastExam,
);

// 7. GET PAST EXAM BY SLUG
router.get(
  "/:slug/public",
  validateRequest(pastExamValidations.getPastExamBySlugSchema),
  pastExamControllers.getPastExamBySlug,
);

// 8. GET PAST EXAM BY ID
router.get(
  "/:id",
  validateRequest(pastExamValidations.getPastExamByIdSchema),
  pastExamControllers.getPastExamById,
);

// 9. DELETE PAST EXAM BY ID
router.delete(
  "/:id",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(pastExamValidations.deletePastExamByIdSchema),
  pastExamControllers.deletePastExamById,
);

export const pastExamRoutes = router;

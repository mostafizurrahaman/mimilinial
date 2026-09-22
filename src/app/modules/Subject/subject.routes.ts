import express, { Router } from "express";
import { subjectControllers } from "./subject.controllers";
import { subjectValidations } from "./subject.validations";
import { validateRequest } from "../../middlewares";
import { UserRoles } from "../User";
import { auth } from "@/app/middlewares/auth";
import { multerFactory } from "@/app/utils";

const router: Router = express.Router();

/**
 * -------------------------------------------------------------------------
 * SUBJECT MANAGEMENT ROUTES
 * -------------------------------------------------------------------------
 */

// 1. CREATE SUBJECT
router.post(
  "/",
  multerFactory({
    category: "image",
    maxSizeInMB: 5,
  }).fields([
    {
      name: "icon",
      maxCount: 1,
    },
    {
      name: "ogImage",
      maxCount: 1,
    },
  ]),
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(subjectValidations.createSubjectSchema),
  subjectControllers.createSubject,
);

// 2. UPDATE SUBJECT
router.patch(
  "/:id",
  multerFactory({
    category: "image",
    maxSizeInMB: 5,
  }).fields([
    {
      name: "icon",
      maxCount: 1,
    },
    {
      name: "ogImage",
      maxCount: 1,
    },
  ]),
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(subjectValidations.updateSubjectSchema),
  subjectControllers.updateSubject,
);

// 3. GET ALL SUBJECT
router.get(
  "/all",
  validateRequest(subjectValidations.getAllSubjectSchema),
  subjectControllers.getAllSubject,
);

// 3.1 GET ALL Active SUBJECT
router.get(
  "/active",
  validateRequest(subjectValidations.getAllActiveSubjectSchema),
  subjectControllers.getAllActiveSubject,
);
// 4. GET SUBJECT BY ID
router.get(
  "/:id",
  validateRequest(subjectValidations.getSubjectByIdSchema),
  subjectControllers.getSubjectById,
);

// 4. GET SUBJECT BY ID
router.get(
  "/:slug/public",
  validateRequest(subjectValidations.getSubjectBySlugSchema),
  subjectControllers.getSubjectBySlug,
);
// 5. DELETE SUBJECT BY ID
router.delete(
  "/:id",
  validateRequest(subjectValidations.deleteSubjectByIdSchema),
  subjectControllers.deleteSubjectById,
);

export const subjectRoutes = router;

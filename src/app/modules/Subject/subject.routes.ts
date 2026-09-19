import express, { Router } from "express";
import { subjectControllers } from "./subject.controllers";
import { subjectValidations } from "./subject.validations";
import { validateRequest } from "../../middlewares";

const router: Router = express.Router();

/**
 * -------------------------------------------------------------------------
 * SUBJECT MANAGEMENT ROUTES
 * -------------------------------------------------------------------------
 */

// 1. CREATE SUBJECT
router.post(
   "/",
   validateRequest(subjectValidations.createSubjectSchema),
   subjectControllers.createSubject,
);

// 2. UPDATE SUBJECT
router.patch(
   "/:id",
   validateRequest(subjectValidations.updateSubjectSchema),
   subjectControllers.updateSubject,
);

// 3. GET ALL SUBJECT
router.get(
   "/all",
   validateRequest(subjectValidations.getAllSubjectSchema),
   subjectControllers.getAllSubject,
);

// 4. GET SUBJECT BY ID
router.get(
   "/:id",
   validateRequest(subjectValidations.getSubjectByIdSchema),
   subjectControllers.getSubjectById,
);

// 5. DELETE SUBJECT BY ID
router.delete(
   "/:id",
   validateRequest(subjectValidations.deleteSubjectByIdSchema),
   subjectControllers.deleteSubjectById,
);

export const subjectRoutes = router;

import express, { Router } from "express";
import { questionVersionControllers } from "./question-version.controllers";
import { questionVersionValidations } from "./question-version.validations";
import { validateRequest } from "../../middlewares";

const router: Router = express.Router();

/**
 * -------------------------------------------------------------------------
 * QUESTION VERSION MANAGEMENT ROUTES
 * -------------------------------------------------------------------------
 */

// 1. CREATE QUESTION VERSION
router.post(
   "/",
   validateRequest(questionVersionValidations.createQuestionVersionSchema),
   questionVersionControllers.createQuestionVersion,
);

// 2. UPDATE QUESTION VERSION
router.patch(
   "/:id",
   validateRequest(questionVersionValidations.updateQuestionVersionSchema),
   questionVersionControllers.updateQuestionVersion,
);

// 3. GET ALL QUESTION VERSION
router.get(
   "/all",
   validateRequest(questionVersionValidations.getAllQuestionVersionSchema),
   questionVersionControllers.getAllQuestionVersion,
);

// 4. GET QUESTION VERSION BY ID
router.get(
   "/:id",
   validateRequest(questionVersionValidations.getQuestionVersionByIdSchema),
   questionVersionControllers.getQuestionVersionById,
);

// 5. DELETE QUESTION VERSION BY ID
router.delete(
   "/:id",
   validateRequest(questionVersionValidations.deleteQuestionVersionByIdSchema),
   questionVersionControllers.deleteQuestionVersionById,
);

export const questionVersionRoutes = router;

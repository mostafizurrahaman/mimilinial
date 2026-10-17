import express, { Router } from "express";
import { questionsControllers } from "./questions.controllers";
import { validateRequest } from "../../middlewares";

import { auth } from "@/app/middlewares/auth";
import { UserRoles } from "../User";
import { questionValidations } from "./questions.validations";

const router: Router = express.Router();

/**
 * -------------------------------------------------------------------------
 * QUESTIONS MANAGEMENT ROUTES
 * -------------------------------------------------------------------------
 */

// 1. CREATE SINGLE  MCQ QUESTIONS
router.post(
  "/single-mcq",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(questionValidations.createSingleMcqQuestionSchema),
  questionsControllers.createSingleMcqQuestion,
);

// 2. CREATE MULTI MCQ QUESTIONS
router.post(
  "/multi-mcq",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(questionValidations.createMultiMcqOptionSchema),
  questionsControllers.createMultiMcqQuestion,
);

// // 2. UPDATE QUESTIONS
// router.patch(
//   "/:id",
//   validateRequest(questionsValidations.updateQuestionsSchema),
//   questionsControllers.updateQuestions,
// );

// // 3. GET ALL QUESTIONS
// router.get(
//   "/all",
//   validateRequest(questionsValidations.getAllQuestionsSchema),
//   questionsControllers.getAllQuestions,
// );

// // 4. GET QUESTIONS BY ID
// router.get(
//   "/:id",
//   validateRequest(questionsValidations.getQuestionsByIdSchema),
//   questionsControllers.getQuestionsById,
// );

// // 5. DELETE QUESTIONS BY ID
// router.delete(
//   "/:id",
//   validateRequest(questionsValidations.deleteQuestionsByIdSchema),
//   questionsControllers.deleteQuestionsById,
// );

export const questionsRoutes = router;

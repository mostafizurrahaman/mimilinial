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

// 1. CREATE SINGLE MCQ QUESTIONS
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

// 3. CREATE TRUE FALSE QUESTIONS
router.post(
  "/true-false",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(questionValidations.createTrueFalseQuestionSchema),
  questionsControllers.createTrueFalseQuestion,
);

// 4. CREATE FILL IN THE BLANK QUESTIONS
router.post(
  "/fill-blank",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(questionValidations.createFillBlankQuestionSchema),
  questionsControllers.createFillBlankQuestion,
);

// 5. CREATE MATCHING QUESTIONS
router.post(
  "/matching",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(questionValidations.createMatchingQuestionSchema),
  questionsControllers.createMatchingQuestion,
);

// 6. CREATE ORDERING QUESTIONS
router.post(
  "/ordering",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(questionValidations.createOrderingQuestionSchema),
  questionsControllers.createOrderingQuestion,
);

// // UPDATE QUESTIONS
// router.patch(
//   "/:id",
//   validateRequest(questionsValidations.updateQuestionsSchema),
//   questionsControllers.updateQuestions,
// );

// // GET ALL QUESTIONS
// router.get(
//   "/all",
//   validateRequest(questionsValidations.getAllQuestionsSchema),
//   questionsControllers.getAllQuestions,
// );

// // GET QUESTIONS BY ID
// router.get(
//   "/:id",
//   validateRequest(questionsValidations.getQuestionsByIdSchema),
//   questionsControllers.getQuestionsById,
// );

// // DELETE QUESTIONS BY ID
// router.delete(
//   "/:id",
//   validateRequest(questionsValidations.deleteQuestionsByIdSchema),
//   questionsControllers.deleteQuestionsById,
// );

export const questionsRoutes = router;

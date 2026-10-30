import express, { Router } from "express";
import { questionMappingControllers } from "./question-mapping.controllers";
import { questionMappingValidations } from "./question-mapping.validations";
import { validateRequest } from "../../middlewares";
import { UserRoles } from "../User";
import { auth } from "@/app/middlewares/auth";

const router: Router = express.Router();

/**
 * -------------------------------------------------------------------------
 * QUESTION MAPPING MANAGEMENT ROUTES
 * -------------------------------------------------------------------------
 */

// 1. CREATE QUESTION MAPPING
router.post(
  "/",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(questionMappingValidations.createQuestionMappingSchema),
  questionMappingControllers.createQuestionMapping,
);

// 2. UPDATE QUESTION MAPPING
router.patch(
  "/:id",
  validateRequest(questionMappingValidations.updateQuestionMappingSchema),
  questionMappingControllers.updateQuestionMapping,
);

// 3. GET ALL QUESTION MAPPING
router.get(
  "/all",
  validateRequest(questionMappingValidations.getAllQuestionMappingSchema),
  questionMappingControllers.getAllQuestionMapping,
);

// 4. GET QUESTION MAPPING BY ID
router.get(
  "/:id",
  validateRequest(questionMappingValidations.getQuestionMappingByIdSchema),
  questionMappingControllers.getQuestionMappingById,
);

// 5. DELETE QUESTION MAPPING BY ID
router.delete(
  "/:id",
  validateRequest(questionMappingValidations.deleteQuestionMappingByIdSchema),
  questionMappingControllers.deleteQuestionMappingById,
);

export const questionMappingRoutes = router;

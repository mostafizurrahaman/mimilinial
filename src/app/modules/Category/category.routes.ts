import express, { Router } from "express";
import { categoryControllers } from "./category.controllers";
import { categoryValidations } from "./category.validations";
import { validateRequest } from "../../middlewares";
import { auth } from "@/app/middlewares/auth";
import { UserRoles } from "../User";
import { multerFactory } from "@/app/utils";
import multer from "multer";

const router: Router = express.Router();

/**
 * -------------------------------------------------------------------------
 * CATEGORY MANAGEMENT ROUTES
 * -------------------------------------------------------------------------
 */

// 1. CREATE CATEGORY
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
  validateRequest(categoryValidations.createCategorySchema),
  categoryControllers.createCategory,
);

// 2. UPDATE CATEGORY
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
  validateRequest(categoryValidations.updateCategorySchema),
  categoryControllers.updateCategory,
);

// 3. GET ALL CATEGORY
router.get(
  "/all",
  validateRequest(categoryValidations.getAllCategorySchema),
  categoryControllers.getAllCategory,
);

// 3.1 GET ALL ACTIVE CATEGORY
router.get(
  "/published",
  validateRequest(categoryValidations.getAllPublishedCategorySchema),
  categoryControllers.getAllPublishedCategory,
);

// 4. GET CATEGORY BY ID
router.get(
  "/:id",
  validateRequest(categoryValidations.getCategoryByIdSchema),
  categoryControllers.getCategoryById,
);

// 5. DELETE CATEGORY BY ID
router.delete(
  "/:id",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(categoryValidations.deleteCategoryByIdSchema),
  categoryControllers.deleteCategoryById,
);

// 6. Mark as Published:
router.patch(
  "/:id/published",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(categoryValidations.markCategoryAsPublishedSchema),
  categoryControllers.markCategoryAsPublished,
);

// 7. Mark as Archived:
router.patch(
  "/:id/archived",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(categoryValidations.markCategoryAsPublishedSchema),
  categoryControllers.markCategoryAsArchived,
);

export const categoryRoutes = router;

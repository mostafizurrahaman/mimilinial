import express, { Router } from "express";
import { passageControllers } from "./passage.controllers";
import { passageValidations } from "./passage.validations";
import { validateRequest } from "../../middlewares";
import { multerFactory } from "@/app/utils";
import { auth } from "@/app/middlewares/auth";
import { UserRoles } from "../User";

const router: Router = express.Router();

/**
 * -------------------------------------------------------------------------
 * PASSAGE MANAGEMENT ROUTES
 * -------------------------------------------------------------------------
 */

// 1. CREATE PASSAGE
router.post(
  "/",
  multerFactory({
    category: "image",
    maxSizeInMB: 10,
  }).fields([
    {
      name: "image",
      maxCount: 1,
    },
    {
      name: "ogImage",
      maxCount: 1,
    },
  ]),
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(passageValidations.createPassageSchema),
  passageControllers.createPassage,
);

// 2. UPDATE PASSAGE
router.patch(
  "/:id",
  multerFactory({
    category: "image",
    maxSizeInMB: 10,
  }).fields([
    {
      name: "image",
      maxCount: 1,
    },
    {
      name: "ogImage",
      maxCount: 1,
    },
  ]),
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(passageValidations.updatePassageSchema),
  passageControllers.updatePassage,
);

// 3. GET ALL PASSAGE
router.get(
  "/all",
  validateRequest(passageValidations.getAllPassageSchema),
  passageControllers.getAllPassage,
);

// 3. GET ALL PASSAGE
router.get(
  "/published",
  validateRequest(passageValidations.getPublishedActivePassageSchema),
  passageControllers.getAllPublishedPassages,
);

// 4. GET PASSAGE BY ID
router.get(
  "/:id",

  validateRequest(passageValidations.getPassageByIdSchema),
  passageControllers.getPassageById,
);

// 5. DELETE PASSAGE BY ID
router.delete(
  "/:id",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(passageValidations.deletePassageByIdSchema),
  passageControllers.deletePassageById,
);

// 6. DELETE PASSAGE BY ID
router.patch(
  "/:id/published",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(passageValidations.markAsPublishedSchema),
  passageControllers.markAsPublished,
);

// 6. DELETE PASSAGE BY ID
router.patch(
  "/:id/archived",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(passageValidations.markAsArchivedSchema),
  passageControllers.markAsArchived,
);

export const passageRoutes = router;

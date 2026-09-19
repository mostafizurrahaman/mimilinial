import express, { Router } from "express";
import { trackControllers } from "./track.controllers";
import { trackValidations } from "./track.validations";
import { validateRequest } from "../../middlewares";
import { UserRoles } from "../User";
import { auth } from "@/app/middlewares/auth";

const router: Router = express.Router();

/**
 * -------------------------------------------------------------------------
 * TRACK MANAGEMENT ROUTES
 * -------------------------------------------------------------------------
 */

// 1. CREATE TRACK
router.post(
  "/",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(trackValidations.createTrackSchema),
  trackControllers.createTrack,
);

// 2. UPDATE TRACK
router.patch(
  "/:id",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(trackValidations.updateTrackSchema),
  trackControllers.updateTrack,
);

// 3. GET ALL TRACK
router.get(
  "/all",
  validateRequest(trackValidations.getAllTrackSchema),
  trackControllers.getAllTrack,
);

// 4. GET TRACK BY ID
router.get(
  "/:id",
  validateRequest(trackValidations.getTrackByIdSchema),
  trackControllers.getTrackById,
);

// 5. DELETE TRACK BY ID
router.delete(
  "/:id",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(trackValidations.deleteTrackByIdSchema),
  trackControllers.deleteTrackById,
);

export const trackRoutes = router;

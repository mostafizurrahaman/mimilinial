import express, { Router } from "express";
import { mediaControllers } from "./media.controllers";
import { mediaValidations } from "./media.validations";
import { validateRequest } from "../../middlewares";
import { UserRoles } from "../User";
import { auth } from "@/app/middlewares/auth";
import { multerFactory } from "@/app/utils";

const router: Router = express.Router();

/**
 * -------------------------------------------------------------------------
 * MEDIA MANAGEMENT ROUTES
 * -------------------------------------------------------------------------
 */

// 1. CREATE MEDIA
router.post(
   "/",
   multerFactory({
      allowedExtensions: ["jpeg", "jpg", "png", "gif"],
      maxSizeInMB: 10 
   }).single("image"),
   auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
   mediaControllers.createMedia,
);

// 2. UPDATE MEDIA
router.patch(
   "/:id",
   validateRequest(mediaValidations.updateMediaSchema),
   mediaControllers.updateMedia,
);

// 3. GET ALL MEDIA
router.get(
   "/all",
   validateRequest(mediaValidations.getAllMediaSchema),
   mediaControllers.getAllMedia,
);

// 4. GET MEDIA BY ID
router.get(
   "/:id",
   validateRequest(mediaValidations.getMediaByIdSchema),
   mediaControllers.getMediaById,
);

// 5. DELETE MEDIA BY ID
router.delete(
   "/:id",
   validateRequest(mediaValidations.deleteMediaByIdSchema),
   mediaControllers.deleteMediaById,
);

export const mediaRoutes = router;

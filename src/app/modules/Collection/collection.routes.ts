import express, { Router } from "express";
import { collectionControllers } from "./collection.controllers";
import { collectionValidations } from "./collection.validations";
import { validateRequest } from "../../middlewares";
import { auth } from "@/app/middlewares/auth";
import { UserRoles } from "../User";
import { multerFactory } from "@/app/utils";

const router: Router = express.Router();

/**
 * -------------------------------------------------------------------------
 * COLLECTION MANAGEMENT ROUTES
 * -------------------------------------------------------------------------
 */

// 1. CREATE COLLECTION
router.post(
   "/",
   multerFactory({
      allowedExtensions: ["jpeg", "jpeg", "webp", "png"],
      maxSizeInMB: 5,
   }).single("icon"),
   auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
   validateRequest(collectionValidations.createCollectionSchema),
   collectionControllers.createCollection,
);

// 2. UPDATE COLLECTION
router.patch(
   "/:id",
   multerFactory({
      allowedExtensions: ["jpeg", "jpeg", "webp", "png"],
      maxSizeInMB: 5,
   }).single("icon"),
   validateRequest(collectionValidations.updateCollectionSchema),
   collectionControllers.updateCollection,
);

// 3. GET ALL COLLECTION
router.get(
   "/all",
   validateRequest(collectionValidations.getAllCollectionSchema),
   collectionControllers.getAllCollection,
);

// 4. GET COLLECTION BY ID
router.get(
   "/:id",
   validateRequest(collectionValidations.getCollectionByIdSchema),
   collectionControllers.getCollectionById,
);

// 5. DELETE COLLECTION BY ID
router.delete(
   "/:id",
   auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
   validateRequest(collectionValidations.deleteCollectionByIdSchema),
   collectionControllers.deleteCollectionById,
);

export const collectionRoutes = router;

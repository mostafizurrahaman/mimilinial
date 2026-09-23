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
   validateRequest(collectionValidations.createCollectionSchema),
   collectionControllers.createCollection,
);

// 2. UPDATE COLLECTION
router.patch(
   "/:id",
   multerFactory({
      allowedExtensions: ["jpeg", "jpeg", "webp", "png"],
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
   auth(UserRoles.ADMIN),
   auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
   validateRequest(collectionValidations.updateCollectionSchema),
   collectionControllers.updateCollection,
);

// 2.1 Update Status:
router.patch(
   "/:id/published",
   auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
   validateRequest(collectionValidations.markCollectionAsPublishedSchema),
   collectionControllers.markAsPublished,
);

// 2.2 Update Status:
router.patch(
   "/:id/archived",
   auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
   validateRequest(collectionValidations.markCollectionAsArchivedSchema),
   collectionControllers.markAsArchived,
);

// 3. GET ALL COLLECTION
router.get(
   "/all",
   auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
   validateRequest(collectionValidations.getAllCollectionSchema),
   collectionControllers.getAllCollection,
);

// 3.1 GET all published Collection:
router.get(
   "/published",
   validateRequest(collectionValidations.getAllPublishedCollectionSchema),
   collectionControllers.getAllPublishedCollection,
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

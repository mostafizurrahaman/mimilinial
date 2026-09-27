import express, { Router } from "express";
import { passageControllers } from "./passage.controllers";
import { passageValidations } from "./passage.validations";
import { validateRequest } from "../../middlewares";
import { multerFactory } from "@/app/utils";

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
   validateRequest(passageValidations.createPassageSchema),
   passageControllers.createPassage,
);

// 2. UPDATE PASSAGE
router.patch(
   "/:id",
   validateRequest(passageValidations.updatePassageSchema),
   passageControllers.updatePassage,
);

// 3. GET ALL PASSAGE
router.get(
   "/all",
   validateRequest(passageValidations.getAllPassageSchema),
   passageControllers.getAllPassage,
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
   validateRequest(passageValidations.deletePassageByIdSchema),
   passageControllers.deletePassageById,
);

export const passageRoutes = router;

import express, { Router } from "express";
import { topicControllers } from "./topic.controllers";
import { topicValidations } from "./topic.validations";
import { validateRequest } from "../../middlewares";

const router: Router = express.Router();

/**
 * -------------------------------------------------------------------------
 * TOPIC MANAGEMENT ROUTES
 * -------------------------------------------------------------------------
 */

// 1. CREATE TOPIC
router.post(
   "/",
   validateRequest(topicValidations.createTopicSchema),
   topicControllers.createTopic,
);

// 2. UPDATE TOPIC
router.patch(
   "/:id",
   validateRequest(topicValidations.updateTopicSchema),
   topicControllers.updateTopic,
);

// 3. GET ALL TOPIC
router.get(
   "/all",
   validateRequest(topicValidations.getAllTopicSchema),
   topicControllers.getAllTopic,
);

// 4. GET TOPIC BY ID
router.get(
   "/:id",
   validateRequest(topicValidations.getTopicByIdSchema),
   topicControllers.getTopicById,
);

// 5. DELETE TOPIC BY ID
router.delete(
   "/:id",
   validateRequest(topicValidations.deleteTopicByIdSchema),
   topicControllers.deleteTopicById,
);

export const topicRoutes = router;

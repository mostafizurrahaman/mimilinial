import express, { Router } from "express";
import { topicControllers } from "./topic.controllers";
import { topicValidations } from "./topic.validations";
import { validateRequest } from "../../middlewares";
import { auth } from "../../middlewares/auth";
import { UserRoles } from "../User";

const router: Router = express.Router();

/**
 * -------------------------------------------------------------------------
 * TOPIC MANAGEMENT ROUTES
 * -------------------------------------------------------------------------
 */

// 1. CREATE TOPIC
router.post(
  "/",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(topicValidations.createTopicSchema),
  topicControllers.createTopic,
);

// 2. UPDATE TOPIC
router.patch(
  "/:id",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(topicValidations.updateTopicSchema),
  topicControllers.updateTopic,
);

// 3. GET ALL TOPIC
router.get(
  "/all",
  validateRequest(topicValidations.getAllTopicSchema),
  topicControllers.getAllTopic,
);

// 3.1 GET ALL PUBLISHED TOPIC
router.get(
  "/published",
  validateRequest(topicValidations.getAllPublishedTopicSchema),
  topicControllers.getAllPublishedTopic,
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
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(topicValidations.deleteTopicByIdSchema),
  topicControllers.deleteTopicById,
);

// 6. Mark as Published
router.patch(
  "/:id/published",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(topicValidations.markTopicAsPublishedSchema),
  topicControllers.markAsPublished,
);

// 7. Mark as Archived
router.patch(
  "/:id/archived",
  auth(UserRoles.ADMIN, UserRoles.SUPER_ADMIN),
  validateRequest(topicValidations.markTopicAsArchivedSchema),
  topicControllers.markAsArchived,
);

export const topicRoutes = router;

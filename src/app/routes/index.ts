import express, { Router } from "express";
import { userRoutes } from "@/app/modules/User";
import { authRoutes } from "../modules/Auth";
import { collectionRoutes } from "../modules/Collection";
import { categoryRoutes } from "../modules/Category";
import { trackRoutes } from "../modules/Track";
import { subjectRoutes } from "../modules/Subject";
import { topicRoutes } from "../modules/Topic";
import { passageRoutes } from "../modules/Passage";
import { questionsRoutes } from "../modules/Questions";
import { mediaRoutes } from "../modules/Media";

const router: Router = express();

const routes = [
  {
    path: "/auth",
    route: authRoutes,
  },
  {
    path: "/user",
    route: userRoutes,
  },
  {
    path: "/collection",
    route: collectionRoutes,
  },
  {
    path: "/category",
    route: categoryRoutes,
  },
  {
    path: "/track",
    route: trackRoutes,
  },
  {
    path: "/subject",
    route: subjectRoutes,
  },
  {
    path: "/topic",
    route: topicRoutes,
  },
  {
    path: "/passage",
    route: passageRoutes,
  },
  {
    path: "/questions",
    route: questionsRoutes,
  },
  {
    path: "/media",
    route: mediaRoutes,
  },
];

routes.forEach((route) => router.use(route.path, route.route));

export const allRoutes = router;

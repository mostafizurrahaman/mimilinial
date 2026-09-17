import express, { Router } from "express";
import { userRoutes } from "@/app/modules/User";
import { authRoutes } from "../modules/Auth";
import { collectionRoutes } from "../modules/Collection";

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
];

routes.forEach((route) => router.use(route.path, route.route));

export const allRoutes = router;

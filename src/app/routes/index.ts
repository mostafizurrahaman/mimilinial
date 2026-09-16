import express, { Router } from "express";
import { userRoutes } from "@/app/modules/User";

const router: Router = express();

const routes = [
  {
    path: "/auth",
    route: userRoutes,
  },
];

routes.forEach((route) => router.use(route.path, route.route));

export const allRoutes = router;

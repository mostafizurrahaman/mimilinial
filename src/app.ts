import express, { type Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import helmet from "helmet";
import { getRateLimiter } from "./app/libs";
import globalErrorHandler from "./app/middlewares/global-error-handler";
import { notFound } from "./app/middlewares";
import { allRoutes } from "./app/routes";

/**
 * ====================
 *       App Setup
 * ===================
 */

const app: Application = express();

/**
 * ====================
 *      Prepare rate limiter:
 * ===================
 */

const limiter = getRateLimiter(1, 100, "Too many request");

/**
 * ====================
 *       Configure Application Level Middleware:
 * ===================
 */

app.use(
   morgan(":method :url :status :res[content-length] - :response-time ms"),
);
app.use(helmet());
app.use(express.json({ type: "application/json" }));
app.use(cookieParser());
app.use(
   cors({
      origin: "*", //: TODO: Has to implement dynamic cors*
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
   }),
);

/**
 * ====================
 *   Routes
 * ===================
 */

app.get("/", (req, res) => {
   res.json({
      message: "Server is running now.",
   });
});

app.get("/api/v1", (req, res) => {
   res.json({
      message: "Version 1 port also healthy now.",
   });
});

app.use("/api/v1", allRoutes);

app.use(globalErrorHandler);

app.use(notFound);

export default app;

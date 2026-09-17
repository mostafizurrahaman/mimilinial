import type { ZodObject } from "zod";
import { configs } from "@/app/configs";
import { catchAsync } from "@/app/utils/catch-async";

export const validateRequest = (schema: ZodObject) => {
   return catchAsync(async (req, res, next) => {
      if (configs.nodeEnv === "development") {
         console.log("Before Validation", {
            body: req.body,
            params: req.params,
            query: req.query,
            cookies: req.cookies,
         });
      }

      const { data, success, error } = await schema.safeParseAsync({
         body: req.body,
         params: req.params,
         query: req.query,
         cookies: req.cookies,
      });

      if (configs.nodeEnv === "development") {
         console.log("After Validation", {
            body: req.body,
            params: req.params,
            query: req.query,
            cookies: req.cookies,
         });
      }

      if (success) {
         if (data.body) {
            req.body = data.body;
         }

         if (data.cookies) {
            req.cookies = data.cookies;
         }

         req.validQuery = req.query;

         next();
      } else {
         console.log(error);
         next(error);
      }
   });
};

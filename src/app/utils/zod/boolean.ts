import z from "zod";

export const requiredStrBoolean = (fieldName: string) =>
   z
      .string({
         error: `${fieldName} should be true/false.`,
      })
      .refine((value) => value === "true" || value === "false", {
         error: `${fieldName} should be true/false.`,
      })
      .transform((value) => value === "true");

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Request } from "express";
import type { IJwtUserPayload } from "@/app/interfaces";
import { UnauthorizedError } from "@/app/errors";
import { db } from "@/app/db";
import { users } from "@/app/db/schemas";
import { eq } from "drizzle-orm";

export const getUserFromRequest = async (req: Request) => {
   const jwtUser = (req as any)?.user as IJwtUserPayload;

   const user = await db.query.users.findFirst({
      where: { id: jwtUser?._id },
   });

   if (!user) {
      throw new UnauthorizedError("User not found.");
   }

   return user;
};

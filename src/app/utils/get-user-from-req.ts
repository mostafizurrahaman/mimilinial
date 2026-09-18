/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Request } from "express";
import type { IJwtUserPayload } from "@/app/interfaces";
import { User } from "@/app/modules/User";
import { UnauthorizedError } from "@/app/errors";
import type { IUser } from "../interfaces/user.type";

export const getUserFromRequest = async (req: Request) => {
   const jwtUser = (req as any)?.user as IJwtUserPayload;

   const user = await User.findById(jwtUser?._id).select("+password");

   if (!user) {
      throw new UnauthorizedError("User not found.");
   }

   return user;
};

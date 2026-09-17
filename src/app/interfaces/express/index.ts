import type { IUser } from "../user.type";

declare global {
   namespace Express {
      interface Request {
         user: IUser;
         validQuery: any;
      }
   }
}

export {};

import type { IUserDoc } from "@/app/modules/User";


declare global {
   namespace Express {
      interface Request {
         user: IUserDoc;
         validQuery: any;
      }
   }
}

export {};

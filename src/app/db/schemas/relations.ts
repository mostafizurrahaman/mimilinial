import { defineRelations } from "drizzle-orm";
import { collections } from "./collection.schema";
import { otps } from "./otp.schema";
import { users } from "./user.schema";

export const relations = defineRelations({ users, otps, collections }, (r) => ({
   users: {
      otps: r.many.otps(),
      collections: r.many.collections(),
   },
   otps: {
      user: r.one.users({
         from: r.otps.userId,
         to: r.users.id,
      }),
   },
   collections: {
      author: r.one.users({
         from: r.collections.authorId,
         to: r.users.id,
      }),
   },
}));

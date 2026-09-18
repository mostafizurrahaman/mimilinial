import { configs } from "../configs";
import { db, users, type IUser } from "../db";

import { hashPassword, logger } from "../utils";

export const seedSuperAdmin = async () => {
   const existingSuperAdmin = await db.query.users.findFirst({
      where: {
         role: "super_admin",
      },
   });

   if (existingSuperAdmin) {
      logger.info("Super admin already inserted.");
      return;
   }

   const hashedPassword = await hashPassword(
      configs.superAdmin.password,
      configs.passwordSaltRound,
   );

   const superAdminPayload: Partial<IUser> = {
      name: `${configs.site.name}'s Super Admin`,
      email: configs.superAdmin.email,
      password: hashedPassword,
      phone: configs.superAdmin.phone!,
      role: "super_admin",
      status: "active",
      authProvider: ["email"],
      isOtpVerified: true,
      profileImage: null,
   };

   // Insert the super admin
   await db.insert(users).values(superAdminPayload as IUser);

   logger.info("Super admin inserted successfully");
};

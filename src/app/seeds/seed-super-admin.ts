import { configs } from "../configs";
import { User, UserRoles, UserStatus, type IUser } from "../modules/User";
import { hashPassword, logger } from "../utils";

export const sendSuperAdmin = async () => {
   // Check any super admin exists?:
   const superAdminExists = await User.findOne({
      role: UserRoles.SUPER_ADMIN,
   });
   if (superAdminExists) {
      logger.info("✅ Super admin has already been created.");
      return;
   }

   const hashedPassword = await hashPassword(
      configs.superAdmin.password,
      configs.passwordSaltRound,
   );
   const superAdminPayload = {
      name: `${configs.site.name}`,
      email: configs.superAdmin.email,
      password: hashedPassword,
      phone: configs.superAdmin.phone,
      role: UserRoles.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isOtpVerified: true,
      authProviders: ["email"],
      profileImage: null,
      isTwoFactorEnabled: false,
   };

   await User.create(superAdminPayload as IUser);
   logger.info("✅ Super admin is created successfully.");
};

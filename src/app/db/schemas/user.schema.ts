import { UserStatus } from "@/app/modules/User";
import {
   boolean,
   pgEnum,
   text,
   timestamp,
   uuid,
   varchar,
} from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";

export const UserRoleEnum = pgEnum("user_role", [
   "admin",
   "super_admin",
   "user",
]);

export const UserStatusEnum = pgEnum("user_status", [
   "pending",
   "active",
   "blocked",
   "deleted",
]);

export const authProviderEnum = pgEnum("auth_provider", [
   "email",
   "google",
   "github",
]);

export const users = pgTable("user", {
   id: uuid("id").defaultRandom().primaryKey(),
   name: varchar("name", {
      length: 255,
   }).notNull(),
   email: varchar("email", {
      length: 255,
   })
      .notNull()
      .unique(),
   phone: varchar("phone", {
      length: 20,
   })
      .notNull()
      .unique(),
   password: varchar("password", {
      length: 255,
   }),
   role: UserRoleEnum().default("user"),
   status: UserStatusEnum().default("pending"),
   profileImage: text("profile_image"),
   isOtpVerified: boolean("is_otp_verified").default(false).notNull(),
   authProvider: authProviderEnum("auth_provider").array().notNull(),
   googleId: varchar("google_id"),
   isTwoFactorEnabled: boolean("is_two_factor_enabled")
      .default(false)
      .notNull(),
   twoFactorSecret: text("two_factor_secret"),
   twoFactorBackupCodes: text("two_factor_backup_codes").array().notNull(),
   blockedReason: text("blocked_reason"),
   deletionReason: text("deletion_reason"),
   blockedAt: timestamp("blocked_at", { precision: 6, withTimezone: true }),
   deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true }),
   passwordChangedAt: timestamp("password_changed_at", {
      precision: 6,
      withTimezone: true,
   }),
   logoutAt: timestamp("logout_at", {
      precision: 6,
      withTimezone: true,
   }),
   lastLoginAt: timestamp("last_login_at", {
      precision: 6,
      withTimezone: true,
   }),
   lastActivityAt: timestamp("last_activity_at", {
      precision: 6,
      withTimezone: true,
   }),
});

export type IUser = typeof users.$inferSelect;
export type INewUser = typeof users.$inferInsert;

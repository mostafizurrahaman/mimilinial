import { pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

export const otpTypeEnum = pgEnum('otp_type', ['signup', 'reset']);

export const otps = pgTable('otp', {
   id: uuid('id').defaultRandom().primaryKey(),
   userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
   otpHash: varchar('otp_hash', { length: 255 }).notNull(),
   type: otpTypeEnum().notNull(),
   expiresAt: timestamp('expires_at', { precision: 6, withTimezone: true }).notNull(),
   lastSentAt: timestamp('last_sent_at', { precision: 6, withTimezone: true }).notNull(),
   createdAt: timestamp('created_at', { precision: 6, withTimezone: true }).defaultNow().notNull(),
   updatedAt: timestamp('updated_at', { precision: 6, withTimezone: true }).defaultNow().notNull(),
});

export type IOtp = typeof otps.$inferSelect;
export type INewOtp = typeof otps.$inferInsert;

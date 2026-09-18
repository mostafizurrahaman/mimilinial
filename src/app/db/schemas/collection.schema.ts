import { boolean, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

export const collections = pgTable('collection', {
   id: uuid('id').defaultRandom().primaryKey(),
   name: varchar('name', { length: 255 }).notNull(),
   slug: varchar('slug', { length: 255 }).notNull().unique(),
   isActive: boolean('is_active').notNull().default(true),
   authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
   icon: text('icon'),
   createdAt: timestamp('created_at', { precision: 6, withTimezone: true }).defaultNow().notNull(),
   updatedAt: timestamp('updated_at', { precision: 6, withTimezone: true }).defaultNow().notNull(),
});

export type ICollection = typeof collections.$inferSelect;
export type INewCollection = typeof collections.$inferInsert;

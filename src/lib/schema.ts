import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const journeyMaps = sqliteTable('journey_maps', {
  id: integer('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const touchpoints = sqliteTable('touchpoints', {
  id: integer('id').primaryKey(),
  journeyMapId: integer('journey_map_id').notNull().references(() => journeyMaps.id),
  title: text('title').notNull(),
  description: text('description'),
  emotion: text('emotion'), // positive, neutral, negative
  xPosition: integer('x_position').notNull(), // Position along the journey path (0-100)
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
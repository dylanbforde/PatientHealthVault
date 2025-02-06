import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  emergencyContact: text("emergency_contact"),
  bloodType: text("blood_type"),
  allergies: text("allergies").array(),
});

export const healthRecords = pgTable("health_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  recordType: text("record_type").notNull(),
  content: jsonb("content").notNull(),
  facility: text("facility").notNull(),
  sharedWith: integer("shared_with").array(),
  isEmergencyAccessible: boolean("is_emergency_accessible").default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  emergencyContact: true,
  bloodType: true,
  allergies: true,
});

export const insertHealthRecordSchema = createInsertSchema(healthRecords).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type HealthRecord = typeof healthRecords.$inferSelect;
export type InsertHealthRecord = z.infer<typeof insertHealthRecordSchema>;

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
  publicKey: text("public_key"),
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
  signature: text("signature"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: text("verified_by"),
});

// Custom schema for health records that properly handles date
const healthRecordInsertSchema = z.object({
  userId: z.number(),
  title: z.string().min(1, "Title is required"),
  date: z.preprocess((arg) => {
    if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
    return arg;
  }, z.date()),
  recordType: z.string().min(1, "Record type is required"),
  content: z.object({
    notes: z.string()
  }).or(z.record(z.unknown())),
  facility: z.string().min(1, "Facility is required"),
  sharedWith: z.array(z.number()).default([]),
  isEmergencyAccessible: z.boolean().default(false),
  signature: z.string().nullable().optional(),
  verifiedAt: z.date().nullable().optional(),
  verifiedBy: z.string().nullable().optional(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  emergencyContact: true,
  bloodType: true,
  allergies: true,
  publicKey: true,
});

export const insertHealthRecordSchema = healthRecordInsertSchema;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type HealthRecord = typeof healthRecords.$inferSelect;
export type InsertHealthRecord = z.infer<typeof insertHealthRecordSchema>;
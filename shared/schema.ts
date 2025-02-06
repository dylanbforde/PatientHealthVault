import { pgTable, text, serial, integer, boolean, jsonb, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the emergency contact schema
export const emergencyContactSchema = z.object({
  username: z.string().min(1, "Username is required"),
  name: z.string().min(1, "Name is required"),
  relationship: z.string().min(1, "Relationship is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email").optional(),
  canViewRecords: z.boolean().default(false),
});

// Define shared record access schema
export const sharedAccessSchema = z.object({
  username: z.string(),
  accessGrantedAt: z.date(),
  accessLevel: z.enum(["view", "emergency"]),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").notNull().unique().defaultRandom(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  emergencyContacts: jsonb("emergency_contacts").$type<z.infer<typeof emergencyContactSchema>[]>(),
  bloodType: text("blood_type"),
  allergies: text("allergies").array(),
  publicKey: text("public_key"),
  gpUsername: text("gp_username"),
  gpName: text("gp_name"),
  gpContact: text("gp_contact"),
  isGP: boolean("is_gp").default(false),
  patientCode: text("patient_code").unique(), // Unique code for GP record sharing
});

export const healthRecords = pgTable("health_records", {
  id: serial("id").primaryKey(),
  patientUuid: uuid("patient_uuid").notNull(), // Changed from userId to patientUuid
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  recordType: text("record_type").notNull(),
  content: jsonb("content").notNull(),
  facility: text("facility").notNull(),
  sharedWith: jsonb("shared_with").$type<z.infer<typeof sharedAccessSchema>[]>().default([]),
  isEmergencyAccessible: boolean("is_emergency_accessible").default(false),
  signature: text("signature"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: text("verified_by"),
  status: text("status").default("pending"), // pending, accepted, rejected
  sharedByGP: text("shared_by_gp"), // GP username who shared the record
});

// Custom schema for health records that properly handles date
const healthRecordSchema = z.object({
  patientUuid: z.string().uuid(), // Changed from userId to patientUuid
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
  sharedWith: sharedAccessSchema.array().default([]),
  isEmergencyAccessible: z.boolean().default(false),
  signature: z.string().nullable().optional(),
  verifiedAt: z.date().nullable().optional(),
  verifiedBy: z.string().nullable().optional(),
  status: z.enum(["pending", "accepted", "rejected"]).default("pending"),
  sharedByGP: z.string().optional(),
});

// Update the insert schema for users
export const insertUserSchema = createInsertSchema(users).extend({
  emergencyContacts: emergencyContactSchema.array().default([]),
  gpUsername: z.string().optional(),
  gpName: z.string().optional(),
  gpContact: z.string().optional(),
  isGP: z.boolean().default(false),
});

export const insertHealthRecordSchema = healthRecordSchema;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type HealthRecord = typeof healthRecords.$inferSelect;
export type InsertHealthRecord = z.infer<typeof insertHealthRecordSchema>;
export type EmergencyContact = z.infer<typeof emergencyContactSchema>;
export type SharedAccess = z.infer<typeof sharedAccessSchema>;
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

// Update the health record content schema
const healthRecordContentSchema = z.object({
  notes: z.string().min(1, "Notes are required"),
  diagnosis: z.string().min(1, "Diagnosis is required"),
  treatment: z.string().min(1, "Treatment plan is required"),
  privateNotes: z.string().optional(),
});

// Define shared record access schema
export const sharedAccessSchema = z.object({
  username: z.string(),
  accessGrantedAt: z.date(),
  accessLevel: z.enum(["view", "emergency"]),
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
  content: healthRecordContentSchema,
  facility: z.string().min(1, "Facility is required"),
  sharedWith: sharedAccessSchema.array().default([]),
  isEmergencyAccessible: z.boolean().default(false),
  signature: z.string().nullable().optional(),
  verifiedAt: z.date().nullable().optional(),
  verifiedBy: z.string().nullable().optional(),
  status: z.enum(["pending", "accepted", "rejected"]).default("pending"),
  sharedByGP: z.string().optional(),
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


// Update the insert schema for users
export const insertUserSchema = createInsertSchema(users).extend({
  emergencyContacts: emergencyContactSchema.array().default([]),
  gpUsername: z.string().optional(),
  gpName: z.string().optional(),
  gpContact: z.string().optional(),
  isGP: z.boolean().default(false),
});

export const insertHealthRecordSchema = healthRecordSchema;

// New schema for medical documents
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").notNull().unique().defaultRandom(),
  patientUuid: uuid("patient_uuid").notNull(),
  uploadedBy: text("uploaded_by").notNull(), // GP's username
  title: text("title").notNull(),
  type: text("type").notNull(), // e.g., "lab_result", "prescription", "imaging"
  contentType: text("content_type").notNull(), // MIME type
  content: text("content").notNull(), // Base64 encoded content
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  description: text("description"),
  tags: text("tags").array(),
  isPrivate: boolean("is_private").default(false),
});

// New schema for appointments
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").notNull().unique().defaultRandom(),
  patientUuid: uuid("patient_uuid").notNull(),
  gpUsername: text("gp_username").notNull(),
  datetime: timestamp("datetime").notNull(),
  duration: integer("duration").notNull(), // in minutes
  status: text("status").default("scheduled"), // scheduled, completed, cancelled
  type: text("type").notNull(), // e.g., "checkup", "follow_up", "consultation"
  notes: text("notes"),
  reminderSent: boolean("reminder_sent").default(false),
});

// Document insert schema
export const insertDocumentSchema = createInsertSchema(documents).extend({
  content: z.string().transform((val) => val),
  type: z.enum(["lab_result", "prescription", "imaging", "other"]),
  contentType: z.string().min(1, "Content type is required"),
  isPrivate: z.boolean().default(false),
});

// Appointment insert schema
export const insertAppointmentSchema = createInsertSchema(appointments).extend({
  type: z.enum(["checkup", "follow_up", "consultation", "other"]),
  duration: z.number().min(15).max(120),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type HealthRecord = typeof healthRecords.$inferSelect;
export type InsertHealthRecord = z.infer<typeof insertHealthRecordSchema>;
export type EmergencyContact = z.infer<typeof emergencyContactSchema>;
export type SharedAccess = z.infer<typeof sharedAccessSchema>;

// Add new types for Documents and Appointments
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;
import { users, healthRecords, documents, appointments, type User, type InsertUser, type HealthRecord, type InsertHealthRecord, type Document, type InsertDocument, type Appointment, type InsertAppointment } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { randomBytes } from "crypto";

const PostgresStore = connectPg(session);

export interface IStorage {
  // Existing methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByPatientCode(patientCode: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPublicKey(userId: number, publicKey: string): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User>;
  generateUniquePatientCode(): Promise<string>;
  getHealthRecords(userId: number): Promise<HealthRecord[]>;
  getHealthRecord(id: number): Promise<HealthRecord | undefined>;
  createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord>;
  updateHealthRecordSharing(id: number, sharedWith: any[]): Promise<HealthRecord>;
  updateHealthRecordStatus(id: number, status: "pending" | "accepted" | "rejected"): Promise<HealthRecord>;
  updateEmergencyAccess(id: number, isEmergencyAccessible: boolean): Promise<HealthRecord>;
  verifyHealthRecord(id: number, verifiedBy: string): Promise<HealthRecord>;
  getSharedRecords(username: string): Promise<HealthRecord[]>;

  // New methods for documents
  getPatientDocuments(patientUuid: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;

  // New methods for appointments
  getPatientAppointments(patientUuid: string): Promise<Appointment[]>;
  getGPAppointments(gpUsername: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(id: number, status: string): Promise<Appointment>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUserByPatientCode(patientCode: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          fullName: users.fullName,
          isGP: users.isGP,
          patientCode: users.patientCode,
          bloodType: users.bloodType,
          allergies: users.allergies,
          emergencyContacts: users.emergencyContacts,
          gpUsername: users.gpUsername,
          gpName: users.gpName,
          gpContact: users.gpContact,
        })
        .from(users)
        .where(eq(users.patientCode, patientCode));

      return user;
    } catch (error) {
      console.error('Error in getUserByPatientCode:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async generateUniquePatientCode(): Promise<string> {
    while (true) {
      const code = randomBytes(3)
        .toString('hex')
        .toUpperCase();

      const existingUser = await this.getUserByPatientCode(code);
      if (!existingUser) {
        return code;
      }
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    let userToCreate = { ...insertUser };

    if (!insertUser.isGP) {
      const patientCode = await this.generateUniquePatientCode();
      userToCreate = { ...userToCreate, patientCode };
    }

    const [user] = await db.insert(users).values(userToCreate).returning();
    return user;
  }

  async updateUserPublicKey(userId: number, publicKey: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ publicKey })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    console.log('Updating user with ID:', id, 'Data:', JSON.stringify(data, null, 2));

    const sanitizedData = {
      ...data,
      emergencyContacts: data.emergencyContacts || [],
      allergies: data.allergies || []
    };

    const [user] = await db
      .update(users)
      .set(sanitizedData)
      .where(eq(users.id, id))
      .returning();

    console.log('Updated user result:', JSON.stringify(user, null, 2));
    return user;
  }

  async getHealthRecords(userId: number): Promise<HealthRecord[]> {
    console.log('Fetching health records for user:', userId);

    // Get user info for debugging
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    console.log('User details:', {
      id: user?.id,
      uuid: user?.uuid,
      username: user?.username,
      isGP: user?.isGP,
      patientCode: user?.patientCode
    });

    let records;
    if (user?.isGP) {
      // For GPs, get records they've created
      records = await db
        .select()
        .from(healthRecords)
        .where(eq(healthRecords.facility, user.fullName || ''));
    } else {
      // For patients, get records where their UUID matches
      records = await db
        .select()
        .from(healthRecords)
        .where(eq(healthRecords.patientUuid, user.uuid));
    }

    console.log('Found records:', records.length);
    return records;
  }

  async getHealthRecord(id: number): Promise<HealthRecord | undefined> {
    const [record] = await db
      .select()
      .from(healthRecords)
      .where(eq(healthRecords.id, id));
    return record;
  }

  async createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord> {
    try {
      const [patient] = await db
        .select({
          id: users.id,
          uuid: users.uuid,
          username: users.username,
          fullName: users.fullName,
          patientCode: users.patientCode,
        })
        .from(users)
        .where(eq(users.uuid, record.patientUuid));

      if (!patient) {
        throw new Error('Patient not found');
      }

      const recordToCreate = {
        ...record,
        patientUuid: patient.uuid,
        sharedWith: [{
          username: patient.username,
          accessGrantedAt: new Date(),
          accessLevel: "view"
        }],
        verifiedAt: null,
        verifiedBy: null,
        signature: null,
        status: record.status || "pending",
        isEmergencyAccessible: record.isEmergencyAccessible || false
      };

      const [newRecord] = await db
        .insert(healthRecords)
        .values([recordToCreate])
        .returning();

      return newRecord;
    } catch (error) {
      console.error('Error in createHealthRecord:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async updateHealthRecordSharing(id: number, sharedWith: any[]): Promise<HealthRecord> {
    const [record] = await db
      .update(healthRecords)
      .set({ sharedWith })
      .where(eq(healthRecords.id, id))
      .returning();
    return record;
  }

  async updateHealthRecordStatus(
    id: number,
    status: "pending" | "accepted" | "rejected"
  ): Promise<HealthRecord> {
    const [record] = await db
      .update(healthRecords)
      .set({ status })
      .where(eq(healthRecords.id, id))
      .returning();
    return record;
  }

  async updateEmergencyAccess(id: number, isEmergencyAccessible: boolean): Promise<HealthRecord> {
    const [record] = await db
      .update(healthRecords)
      .set({ isEmergencyAccessible })
      .where(eq(healthRecords.id, id))
      .returning();
    return record;
  }

  async verifyHealthRecord(id: number, verifiedBy: string): Promise<HealthRecord> {
    const [record] = await db
      .update(healthRecords)
      .set({
        verifiedAt: new Date(),
        verifiedBy,
      })
      .where(eq(healthRecords.id, id))
      .returning();
    return record;
  }

  async getSharedRecords(username: string): Promise<HealthRecord[]> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));

      if (!user) {
        return [];
      }

      // Use parameterized queries instead of string interpolation
      const records = await db
        .select()
        .from(healthRecords)
        .where(
          or(
            sql`EXISTS (
              SELECT 1 FROM jsonb_array_elements(${healthRecords.sharedWith}) as share
              WHERE (share->>'username')::text = ${username}
              AND (share->>'accessLevel')::text = 'view'
            )`,
            and(
              eq(healthRecords.isEmergencyAccessible, true),
              sql`EXISTS (
                SELECT 1 FROM users u
                WHERE u.uuid = ${healthRecords.patientUuid}
                AND EXISTS (
                  SELECT 1 FROM jsonb_array_elements(u.emergency_contacts) as contact
                  WHERE (contact->>'username')::text = ${username}
                  AND (contact->>'canViewRecords')::boolean = true
                )
              )`
            )
          )
        )
        .orderBy(sql`${healthRecords.date} DESC`);

      // Remove sensitive data before returning
      return records.map(record => {
        const { signature, ...safeRecord } = record;
        return safeRecord;
      });
    } catch (error) {
      console.error('Error in getSharedRecords:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  // Implement new document methods
  async getPatientDocuments(patientUuid: string): Promise<Document[]> {
    console.log('Fetching documents for patient:', patientUuid);
    try {
      // Get patient info first
      const [patient] = await db
        .select()
        .from(users)
        .where(eq(users.uuid, patientUuid));

      if (!patient) {
        throw new Error('Patient not found');
      }

      const docs = await db
        .select()
        .from(documents)
        .where(
          or(
            eq(documents.patientUuid, patientUuid),
            sql`EXISTS (
              SELECT 1 FROM jsonb_array_elements(${documents.sharedWith}) as share
              WHERE (share->>'username')::text = ${patient.username}
              AND (share->>'accessLevel')::text = 'view'
            )`
          )
        )
        .orderBy(sql`${documents.uploadedAt} DESC`);

      return docs;
    } catch (error) {
      console.error('Error fetching patient documents:', error);
      throw error;
    }
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    console.log('Creating document:', {
      ...document,
      content: document.content ? `<Base64 content length: ${document.content.length}>` : 'No content'
    });

    try {
      // Validate the patient exists
      const [patient] = await db
        .select()
        .from(users)
        .where(eq(users.uuid, document.patientUuid));

      if (!patient) {
        throw new Error('Patient not found');
      }

      // Ensure sharedWith array includes the patient
      const sharedWith = document.sharedWith || [];
      if (!sharedWith.some(share => share.username === patient.username)) {
        sharedWith.push({
          username: patient.username,
          accessGrantedAt: new Date(),
          accessLevel: "view"
        });
      }

      const documentToCreate: InsertDocument = {
        ...document,
        content: document.content || undefined,
        contentType: document.contentType || undefined,
        sharedWith
      };

      const [doc] = await db
        .insert(documents)
        .values(documentToCreate)
        .returning();

      return doc;
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  // Implement new appointment methods
  async getPatientAppointments(patientUuid: string): Promise<Appointment[]> {
    console.log('Fetching appointments for patient:', patientUuid);
    const appts = await db
      .select()
      .from(appointments)
      .where(eq(appointments.patientUuid, patientUuid))
      .orderBy(sql`${appointments.datetime} ASC`);
    return appts;
  }

  async getGPAppointments(gpUsername: string): Promise<Appointment[]> {
    console.log('Fetching appointments for GP:', gpUsername);
    const appts = await db
      .select()
      .from(appointments)
      .where(eq(appointments.gpUsername, gpUsername))
      .orderBy(sql`${appointments.datetime} ASC`);
    return appts;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    console.log('Creating appointment:', appointment);
    const [appt] = await db
      .insert(appointments)
      .values(appointment)
      .returning();
    return appt;
  }

  async updateAppointmentStatus(id: number, status: string): Promise<Appointment> {
    const [appt] = await db
      .update(appointments)
      .set({ status })
      .where(eq(appointments.id, id))
      .returning();
    return appt;
  }
}

export const storage = new DatabaseStorage();
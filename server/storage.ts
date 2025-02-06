import { users, healthRecords, type User, type InsertUser, type HealthRecord, type InsertHealthRecord } from "@shared/schema";
import { db } from "./db";
import { eq, or, and, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { randomBytes } from "crypto";

const PostgresStore = connectPg(session);

export interface IStorage {
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
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.patientCode, patientCode));
    return user;
  }

  async generateUniquePatientCode(): Promise<string> {
    // Keep generating codes until we find a unique one
    while (true) {
      // Generate a 6-character alphanumeric code
      const code = randomBytes(3)
        .toString('hex')
        .toUpperCase();

      // Check if this code is already in use
      const existingUser = await this.getUserByPatientCode(code);
      if (!existingUser) {
        return code;
      }
    }
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

    // Only generate a patient code for non-GP users
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

    // Ensure we're setting empty arrays instead of null for array fields
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
    // Strictly only return records owned by this specific user
    const records = await db
      .select()
      .from(healthRecords)
      .where(eq(healthRecords.userId, userId))
      .orderBy(sql`${healthRecords.date} DESC`);

    return records;
  }

  async getSharedRecords(username: string): Promise<HealthRecord[]> {
    // Get the user's ID first
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));

    if (!user) {
      return [];
    }

    // Get only records that are:
    // 1. NOT owned by this user
    // 2. Either explicitly shared with them or accessible via emergency contact status
    const records = await db
      .select()
      .from(healthRecords)
      .where(
        and(
          // Explicitly exclude records owned by this user
          sql`${healthRecords.userId} != ${user.id}`,
          or(
            // Include records explicitly shared with this user
            sql`EXISTS (
              SELECT 1 FROM jsonb_array_elements(${healthRecords.sharedWith}) as share
              WHERE (share->>'username')::text = ${username}
            )`,
            // Include emergency-accessible records where user is an emergency contact with view permission
            and(
              eq(healthRecords.isEmergencyAccessible, true),
              sql`EXISTS (
                SELECT 1 FROM users u
                WHERE u.id = ${healthRecords.userId}
                AND EXISTS (
                  SELECT 1 FROM jsonb_array_elements(u.emergency_contacts) as contact
                  WHERE (contact->>'username')::text = ${username}
                  AND (contact->>'canViewRecords')::boolean = true
                )
              )`
            )
          )
        )
      )
      .orderBy(sql`${healthRecords.date} DESC`);

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
    const [newRecord] = await db
      .insert(healthRecords)
      .values({
        ...record,
        sharedWith: record.sharedWith || [], // Ensure sharedWith is initialized as an empty array
        verifiedAt: null,
        verifiedBy: null,
        signature: null,
      })
      .returning();
    return newRecord;
  }

  async updateHealthRecordSharing(id: number, sharedWith: any[]): Promise<HealthRecord> {
    const [record] = await db
      .update(healthRecords)
      .set({ sharedWith })
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
}

export const storage = new DatabaseStorage();
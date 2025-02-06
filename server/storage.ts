import { users, healthRecords, type User, type InsertUser, type HealthRecord, type InsertHealthRecord } from "@shared/schema";
import { db } from "./db";
import { eq, or, and, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPublicKey(userId: number, publicKey: string): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User>;

  getHealthRecords(userId: number): Promise<HealthRecord[]>;
  getHealthRecord(id: number): Promise<HealthRecord | undefined>;
  createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord>;
  updateHealthRecordSharing(id: number, sharedWith: any[]): Promise<HealthRecord>;
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

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
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
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Only return records owned by this user
  async getHealthRecords(userId: number): Promise<HealthRecord[]> {
    return db
      .select()
      .from(healthRecords)
      .where(eq(healthRecords.userId, userId))
      .orderBy(sql`${healthRecords.date} DESC`);
  }

  // Only return records explicitly shared with this user or accessible via emergency contact status
  async getSharedRecords(username: string): Promise<HealthRecord[]> {
    const query = db
      .select()
      .from(healthRecords)
      .where(
        and(
          // Exclude records owned by this user
          sql`${healthRecords.userId} != (SELECT id FROM users WHERE username = ${username})`,
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
                WHERE EXISTS (
                  SELECT 1 FROM jsonb_array_elements(u.emergency_contacts) as contact
                  WHERE (contact->>'username')::text = ${username}
                  AND (contact->>'canViewRecords')::boolean = true
                )
                AND u.id = ${healthRecords.userId}
              )`
            )
          )
        )
      )
      .orderBy(sql`${healthRecords.date} DESC`);

    return query;
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
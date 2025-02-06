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

  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

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

  // Only return records owned by the user
  async getHealthRecords(userId: number): Promise<HealthRecord[]> {
    return db
      .select()
      .from(healthRecords)
      .where(eq(healthRecords.userId, userId));
  }

  // Get records shared with the user
  async getSharedRecords(username: string): Promise<HealthRecord[]> {
    return db
      .select()
      .from(healthRecords)
      .where(
        and(
          // Only get records NOT owned by this user
          sql`${healthRecords.userId} != (SELECT id FROM users WHERE username = ${username})`,
          or(
            // Records explicitly shared with the user
            sql`exists (
              select 1 from jsonb_array_elements(${healthRecords.sharedWith}) as share
              where (share->>'username')::text = ${username}
            )`,
            // Records with emergency access AND user is an emergency contact
            and(
              eq(healthRecords.isEmergencyAccessible, true),
              sql`exists (
                select 1 from users
                where exists (
                  select 1 from jsonb_array_elements(users.emergency_contacts) as contact
                  where (contact->>'username')::text = ${username}
                  and (contact->>'canViewRecords')::boolean = true
                )
                and users.id = ${healthRecords.userId}
              )`
            )
          )
        )
      );
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
        sharedWith: record.sharedWith || [],
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
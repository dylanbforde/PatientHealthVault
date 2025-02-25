import { users, healthRecords, type User, type InsertUser, type HealthRecord, type InsertHealthRecord } from "@shared/schema";
import { db } from "./db";
import { eq, or, and, sql, gte, lte, desc } from "drizzle-orm";
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

  getHealthRecords(userId: number, search?: string, category?: string, startDate?: Date, endDate?: Date, patientUuid?: string): Promise<HealthRecord[]>;
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
    console.log('Looking up user by patient code:', patientCode);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.patientCode, patientCode));

    console.log('Found user:', user ? JSON.stringify(user, null, 2) : 'No user found');
    return user;
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

  async getHealthRecords(
    userId: number, 
    search?: string,
    category?: string,
    startDate?: Date,
    endDate?: Date,
    patientUuid?: string
  ): Promise<HealthRecord[]> {
    console.log('Fetching health records for user:', userId);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return [];
    }

    let query = db.select().from(healthRecords);

    // Apply base filters based on user type
    if (user?.isGP) {
      if (patientUuid) {
        query = query.where(eq(healthRecords.patientUuid, patientUuid));
      } else {
        query = query.where(eq(healthRecords.facility, user.fullName || ''));
      }
    } else {
      query = query.where(eq(healthRecords.patientUuid, user.uuid));
    }

    // Apply additional filters
    if (search) {
      query = query.where(sql`(${healthRecords.title} ILIKE ${`%${search}%`} OR ${healthRecords.content}->>'notes' ILIKE ${`%${search}%`})`);
    }
    if (category && category !== 'All') {
      query = query.where(sql`${healthRecords.content}->>'category' = ${category}`);
    }
    if (startDate) {
      query = query.where(gte(healthRecords.date, startDate));
    }
    if (endDate) {
      query = query.where(lte(healthRecords.date, endDate));
    }

    const records = await query.orderBy(desc(healthRecords.date));
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
    console.log('Creating health record with data:', JSON.stringify(record, null, 2));

    // Get the patient's information using the patient code
    const [patient] = await db
      .select()
      .from(users)
      .where(eq(users.uuid, record.patientUuid));

    if (!patient) {
      throw new Error('Patient not found');
    }

    console.log('Creating record for patient:', {
      patientId: patient.id,
      patientUuid: patient.uuid,
      patientName: patient.fullName,
      patientCode: patient.patientCode
    });

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

    console.log('Final record data:', JSON.stringify(recordToCreate, null, 2));

    try {
      const [newRecord] = await db
        .insert(healthRecords)
        .values(recordToCreate)
        .returning();

      console.log('Created health record:', JSON.stringify(newRecord, null, 2));
      return newRecord;
    } catch (error) {
      console.error('Error creating health record:', error);
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
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));

    if (!user) {
      return [];
    }

    // Get records that are shared with this user
    const records = await db
      .select()
      .from(healthRecords)
      .where(
        or(
          // Include records explicitly shared with this user
          sql`EXISTS (
            SELECT 1 FROM jsonb_array_elements(${healthRecords.sharedWith}) as share
            WHERE (share->>'username')::text = ${username}
            AND (share->>'accessLevel')::text = 'view'
          )`,
          // Include emergency-accessible records where user is an emergency contact
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

    return records;
  }
}

export const storage = new DatabaseStorage();
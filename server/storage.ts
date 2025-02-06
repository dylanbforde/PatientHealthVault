import { users, type User, type InsertUser, type HealthRecord, type InsertHealthRecord } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { signRecord, verifyRecord } from "./crypto";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPublicKey(userId: number, publicKey: string): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User>;

  getHealthRecords(userId: number): Promise<HealthRecord[]>;
  getHealthRecord(id: number): Promise<HealthRecord | undefined>;
  createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord>;
  updateHealthRecordSharing(id: number, sharedWith: number[]): Promise<HealthRecord>;
  updateEmergencyAccess(id: number, isEmergencyAccessible: boolean): Promise<HealthRecord>;
  verifyHealthRecord(id: number, verifiedBy: string): Promise<HealthRecord>;

  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private healthRecords: Map<number, HealthRecord>;
  private currentUserId: number;
  private currentRecordId: number;
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.healthRecords = new Map();
    this.currentUserId = 1;
    this.currentRecordId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async updateUserPublicKey(userId: number, publicKey: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const updatedUser = { ...user, publicKey };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");

    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getHealthRecords(userId: number): Promise<HealthRecord[]> {
    return Array.from(this.healthRecords.values()).filter(
      (record) => record.userId === userId
    );
  }

  async getHealthRecord(id: number): Promise<HealthRecord | undefined> {
    return this.healthRecords.get(id);
  }

  async createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord> {
    const id = this.currentRecordId++;
    const newRecord = { 
      ...record, 
      id,
      verifiedAt: null,
      verifiedBy: null,
      signature: null
    } as HealthRecord;
    this.healthRecords.set(id, newRecord);
    return newRecord;
  }

  async verifyHealthRecord(id: number, verifiedBy: string): Promise<HealthRecord> {
    const record = await this.getHealthRecord(id);
    if (!record) throw new Error("Record not found");

    const updatedRecord = { 
      ...record,
      verifiedAt: new Date(),
      verifiedBy
    };
    this.healthRecords.set(id, updatedRecord);
    return updatedRecord;
  }

  async updateHealthRecordSharing(id: number, sharedWith: number[]): Promise<HealthRecord> {
    const record = this.healthRecords.get(id);
    if (!record) throw new Error("Record not found");

    const updatedRecord = { ...record, sharedWith };
    this.healthRecords.set(id, updatedRecord);
    return updatedRecord;
  }

  async updateEmergencyAccess(id: number, isEmergencyAccessible: boolean): Promise<HealthRecord> {
    const record = this.healthRecords.get(id);
    if (!record) throw new Error("Record not found");

    const updatedRecord = { ...record, isEmergencyAccessible };
    this.healthRecords.set(id, updatedRecord);
    return updatedRecord;
  }
}

export const storage = new MemStorage();
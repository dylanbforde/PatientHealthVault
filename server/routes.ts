import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertHealthRecordSchema } from "@shared/schema";
import { ZodError } from "zod";
import { generateKeyPair, signRecord, verifyRecord } from "./crypto";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Generate key pair for user
  app.post("/api/users/generate-keys", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { publicKey, privateKey } = generateKeyPair();
    await storage.updateUserPublicKey(req.user.id, publicKey);

    // Only send private key once - it should be stored securely by the client
    res.json({ publicKey, privateKey });
  });

  app.get("/api/health-records", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const records = await storage.getHealthRecords(req.user.id);
    res.json(records);
  });

  app.post("/api/health-records", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('Unauthorized access attempt to create health record');
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      console.log('Creating health record with data:', JSON.stringify(req.body, null, 2));

      const recordData = insertHealthRecordSchema.parse({
        ...req.body,
        userId: req.user.id,
        sharedWith: req.body.sharedWith || [],
      });

      console.log('Validated record data:', JSON.stringify(recordData, null, 2));

      // Create record first
      const record = await storage.createHealthRecord(recordData);
      console.log('Health record created:', JSON.stringify(record, null, 2));

      // If a signature is provided, verify it
      if (req.body.signature && req.user.publicKey) {
        const isValid = verifyRecord(record, req.user.publicKey);
        if (!isValid) {
          return res.status(400).json({ message: "Invalid record signature" });
        }
        // Update record with verification info
        await storage.verifyHealthRecord(record.id, req.body.facility);
      }

      res.status(201).json(record);
    } catch (err) {
      console.error('Error creating health record:', err);
      if (err instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: err.errors
        });
      } else {
        return res.status(500).json({ 
          message: "Internal server error",
          error: err instanceof Error ? err.message : "Unknown error" 
        });
      }
    }
  });

  // Verify a health record
  app.post("/api/health-records/:id/verify", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const recordId = parseInt(req.params.id);
    const { signature } = req.body;

    const record = await storage.getHealthRecord(recordId);
    if (!record || record.userId !== req.user.id) {
      return res.sendStatus(404);
    }

    if (!req.user.publicKey) {
      return res.status(400).json({ message: "User has no public key" });
    }

    // Verify the signature
    const isValid = verifyRecord({ ...record, signature }, req.user.publicKey);
    if (!isValid) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const verifiedRecord = await storage.verifyHealthRecord(recordId, record.facility);
    res.json(verifiedRecord);
  });

  // Update the record sharing endpoint
  app.put("/api/health-records/:id/share", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const recordId = parseInt(req.params.id);
    const { username, accessLevel } = req.body;

    try {
      // First verify the record belongs to the user
      const record = await storage.getHealthRecord(recordId);
      if (!record || record.userId !== req.user.id) {
        return res.status(404).json({ message: "Record not found" });
      }

      // Find the user to share with
      const targetUser = await storage.getUserByUsername(username);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Add the new share
      const newShare = {
        username: targetUser.username,
        accessGrantedAt: new Date(),
        accessLevel,
      };

      // Update the record's shared access
      const updatedRecord = await storage.updateHealthRecordSharing(
        recordId,
        record.sharedWith.filter(s => s.username !== username).concat(newShare)
      );

      res.json(updatedRecord);
    } catch (err) {
      console.error('Error sharing record:', err);
      res.status(500).json({ 
        message: "Failed to share record",
        error: err instanceof Error ? err.message : "Unknown error" 
      });
    }
  });

  app.delete("/api/health-records/:id/share/:username", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const recordId = parseInt(req.params.id);
    const { username } = req.params;

    try {
      // First verify the record belongs to the user
      const record = await storage.getHealthRecord(recordId);
      if (!record || record.userId !== req.user.id) {
        return res.status(404).json({ message: "Record not found" });
      }

      // Remove the share for this username
      const updatedRecord = await storage.updateHealthRecordSharing(
        recordId,
        record.sharedWith.filter(s => s.username !== username)
      );

      res.json(updatedRecord);
    } catch (err) {
      console.error('Error revoking access:', err);
      res.status(500).json({ 
        message: "Failed to revoke access",
        error: err instanceof Error ? err.message : "Unknown error" 
      });
    }
  });

  app.patch("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { bloodType, emergencyContact, allergies } = req.body;

      // Update only the allowed fields
      const updatedUser = await storage.updateUser(req.user.id, {
        bloodType,
        emergencyContact,
        allergies,
      });

      res.json(updatedUser);
    } catch (err) {
      console.error('Error updating user:', err);
      res.status(500).json({ 
        message: "Failed to update user",
        error: err instanceof Error ? err.message : "Unknown error" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
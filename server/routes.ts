import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertHealthRecordSchema } from "@shared/schema";
import { ZodError } from "zod";
import { generateKeyPair, signRecord, verifyRecord } from "./crypto";
import { hashPassword } from "./auth"; // Added import for hashPassword


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
    const { search, category, startDate, endDate, patientUuid } = req.query;
    const records = await storage.getHealthRecords(
      req.user.id,
      search as string,
      category as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      patientUuid as string
    );
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

  // Add this route after the existing /api/health-records route
  app.post("/api/lookup-patient", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.user.isGP) return res.status(403).json({ message: "Only GPs can lookup patients" });

    const { patientCode } = req.body;
    try {
      const patient = await storage.getUserByPatientCode(patientCode);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json(patient);
    } catch (err) {
      console.error('Error looking up patient:', err);
      res.status(500).json({ 
        message: "Failed to lookup patient",
        error: err instanceof Error ? err.message : "Unknown error" 
      });
    }
  });

  // Add these routes for managing shared record status
  app.post("/api/health-records/:id/accept", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const recordId = parseInt(req.params.id);
    try {
      const record = await storage.getHealthRecord(recordId);
      if (!record || record.userId !== req.user.id) {
        return res.status(404).json({ message: "Record not found" });
      }

      const updatedRecord = await storage.updateHealthRecordStatus(recordId, "accepted");
      res.json(updatedRecord);
    } catch (err) {
      console.error('Error accepting record:', err);
      res.status(500).json({ 
        message: "Failed to accept record",
        error: err instanceof Error ? err.message : "Unknown error" 
      });
    }
  });

  app.post("/api/health-records/:id/reject", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const recordId = parseInt(req.params.id);
    try {
      const record = await storage.getHealthRecord(recordId);
      if (!record || record.userId !== req.user.id) {
        return res.status(404).json({ message: "Record not found" });
      }

      const updatedRecord = await storage.updateHealthRecordStatus(recordId, "rejected");
      res.json(updatedRecord);
    } catch (err) {
      console.error('Error rejecting record:', err);
      res.status(500).json({ 
        message: "Failed to reject record",
        error: err instanceof Error ? err.message : "Unknown error" 
      });
    }
  });

  app.get("/api/shared-records", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const records = await storage.getSharedRecords(req.user.username);
      res.json(records);
    } catch (err) {
      console.error('Error fetching shared records:', err);
      res.status(500).json({ 
        message: "Failed to fetch shared records",
        error: err instanceof Error ? err.message : "Unknown error" 
      });
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
      // Verify the record belongs to the user
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

      // Remove any existing share for this user and add the new one
      const updatedRecord = await storage.updateHealthRecordSharing(
        recordId,
        record.sharedWith ? 
          record.sharedWith.filter(s => s.username !== username).concat(newShare) :
          [newShare]
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
      // Verify the record belongs to the user
      const record = await storage.getHealthRecord(recordId);
      if (!record || record.userId !== req.user.id) {
        return res.status(404).json({ message: "Record not found" });
      }

      // Remove the share for this username
      const updatedRecord = await storage.updateHealthRecordSharing(
        recordId,
        record.sharedWith ? record.sharedWith.filter(s => s.username !== username) : []
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

  // Update the existing emergency contacts endpoint in the updateUser route
  app.patch("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { bloodType, emergencyContacts, allergies, gpUsername, gpName, gpContact } = req.body;
      console.log('Updating user with data:', JSON.stringify({
        bloodType,
        emergencyContacts,
        allergies,
        gpUsername,
        gpName,
        gpContact
      }, null, 2));

      // Validate emergency contacts if provided
      if (emergencyContacts) {
        for (const contact of emergencyContacts) {
          const targetUser = await storage.getUserByUsername(contact.username);
          if (!targetUser) {
            return res.status(400).json({ 
              message: `User not found: ${contact.username}`,
              field: "emergencyContacts"
            });
          }
        }
      }

      // Update user with the provided fields
      const updatedUser = await storage.updateUser(req.user.id, {
        ...(bloodType !== undefined && { bloodType }),
        ...(emergencyContacts !== undefined && { emergencyContacts }),
        ...(allergies !== undefined && { allergies }),
        ...(gpUsername !== undefined && { gpUsername }),
        ...(gpName !== undefined && { gpName }),
        ...(gpContact !== undefined && { gpContact })
      });

      console.log('Updated user:', JSON.stringify(updatedUser, null, 2));
      res.json(updatedUser);
    } catch (err) {
      console.error('Error updating user:', err);
      res.status(500).json({ 
        message: "Failed to update user",
        error: err instanceof Error ? err.message : "Unknown error" 
      });
    }
  });

  // Add back the emergency access endpoint
  app.put("/api/health-records/:id/emergency-access", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const recordId = parseInt(req.params.id);
    const { isEmergencyAccessible } = req.body;

    try {
      const record = await storage.getHealthRecord(recordId);
      if (!record || record.userId !== req.user.id) {
        return res.status(404).json({ message: "Record not found" });
      }

      const updatedRecord = await storage.updateEmergencyAccess(recordId, isEmergencyAccessible);
      res.json(updatedRecord);
    } catch (err) {
      console.error('Error updating emergency access:', err);
      res.status(500).json({ 
        message: "Failed to update emergency access",
        error: err instanceof Error ? err.message : "Unknown error" 
      });
    }
  });

  // Update the existing /api/register route to generate a patient code for non-GP users
  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    // Generate a unique patient code for non-GP users
    let patientCode = null;
    if (!req.body.isGP) {
      patientCode = await storage.generateUniquePatientCode();
    }

    const user = await storage.createUser({
      ...req.body,
      patientCode,
      password: await hashPassword(req.body.password),
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });


  const httpServer = createServer(app);
  return httpServer;
}
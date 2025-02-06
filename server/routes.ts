import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertHealthRecordSchema } from "@shared/schema";
import { ZodError } from "zod";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.get("/api/health-records", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const records = await storage.getHealthRecords(req.user.id);
    res.json(records);
  });

  app.post("/api/health-records", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const data = insertHealthRecordSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      const record = await storage.createHealthRecord(data);
      res.status(201).json(record);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json(err.errors);
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.put("/api/health-records/:id/share", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const recordId = parseInt(req.params.id);
    const { sharedWith } = req.body;
    
    const record = await storage.getHealthRecord(recordId);
    if (!record || record.userId !== req.user.id) {
      return res.sendStatus(404);
    }

    const updatedRecord = await storage.updateHealthRecordSharing(recordId, sharedWith);
    res.json(updatedRecord);
  });

  app.put("/api/health-records/:id/emergency-access", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const recordId = parseInt(req.params.id);
    const { isEmergencyAccessible } = req.body;
    
    const record = await storage.getHealthRecord(recordId);
    if (!record || record.userId !== req.user.id) {
      return res.sendStatus(404);
    }

    const updatedRecord = await storage.updateEmergencyAccess(recordId, isEmergencyAccessible);
    res.json(updatedRecord);
  });

  const httpServer = createServer(app);
  return httpServer;
}

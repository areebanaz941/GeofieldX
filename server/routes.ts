import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import bcrypt from "bcryptjs";
import session from "express-session";
import { v4 as uuidv4 } from "uuid";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  insertUserSchema, 
  insertTaskSchema, 
  insertFeatureSchema, 
  insertBoundarySchema,
  insertTaskUpdateSchema,
  insertTaskEvidenceSchema,
  insertTeamSchema
} from "@shared/schema";
import { z } from "zod";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_multer = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage: storage_multer,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Session setup
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "geowhats-secret-key",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Passport setup
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Incorrect password." });
        }

        // Update user's last active time
        await storage.updateUserLastActive(user.id);
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(path.join(process.cwd(), "uploads"))) {
    fs.mkdirSync(path.join(process.cwd(), "uploads"), { recursive: true });
  }

  // Serve static uploads
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Not authenticated" });
  };

  // Middleware to check if user is supervisor
  const isSupervisor = (req: Request, res: Response, next: any) => {
    if (req.isAuthenticated() && (req.user as any).role === "Supervisor") {
      return next();
    }
    res.status(403).json({ message: "Access denied: Supervisor role required" });
  };

  // Authentication routes
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.json({ user: req.user });
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error during logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/current-user", (req, res) => {
    if (req.isAuthenticated()) {
      const user = { ...(req.user as any) };
      delete user.password; // Don't send password to client
      res.json(user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // If user is registering as field team member, check if team exists and is approved
      if (userData.role === "Field" && userData.teamId) {
        const team = await storage.getTeam(userData.teamId);
        if (!team) {
          return res.status(400).json({ message: "Team does not exist" });
        }
        if (team.status !== "Approved") {
          return res.status(400).json({ message: "Team is not approved for registration" });
        }
      }
      
      // Hash password
      userData.password = await bcrypt.hash(userData.password, 10);
      const newUser = await storage.createUser(userData);
      const userResponse = { ...newUser };
      delete userResponse.password; // Don't send password back
      res.status(201).json(userResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.get("/api/users/field", isAuthenticated, async (req, res) => {
    try {
      const fieldUsers = await storage.getAllFieldUsers();
      // Remove passwords from response
      const usersResponse = fieldUsers.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(usersResponse);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch field users" });
    }
  });

  app.post("/api/users/location", isAuthenticated, async (req, res) => {
    try {
      const { lat, lng } = req.body;
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }
      
      const updatedUser = await storage.updateUserLocation((req.user as any).id, { lat, lng });
      const userResponse = { ...updatedUser };
      delete userResponse.password;
      res.json(userResponse);
    } catch (error) {
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  // Task routes
  app.post("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      taskData.createdBy = (req.user as any).id;
      
      const newTask = await storage.createTask(taskData);
      res.status(201).json(newTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.get("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getAllTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/my-tasks", isAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getTasksByAssignee((req.user as any).id);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.put("/api/tasks/:id/status", isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const updatedTask = await storage.updateTaskStatus(taskId, status, (req.user as any).id);
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ message: "Failed to update task status" });
    }
  });

  app.put("/api/tasks/:id/assign", isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { assignedTo } = req.body;
      
      if (!assignedTo) {
        return res.status(400).json({ message: "AssignedTo is required" });
      }
      
      const updatedTask = await storage.assignTask(taskId, assignedTo);
      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ message: "Failed to assign task" });
    }
  });

  // Task updates routes
  app.post("/api/tasks/:id/updates", isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const updateData = insertTaskUpdateSchema.parse({
        ...req.body,
        taskId,
        userId: (req.user as any).id
      });
      
      const newUpdate = await storage.createTaskUpdate(updateData);
      res.status(201).json(newUpdate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create task update" });
    }
  });

  app.get("/api/tasks/:id/updates", isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const updates = await storage.getTaskUpdates(taskId);
      res.json(updates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task updates" });
    }
  });

  // Task evidence routes
  app.post("/api/tasks/:id/evidence", isAuthenticated, upload.single("image"), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { description } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ message: "Image file is required" });
      }
      
      const imageUrl = `/uploads/${req.file.filename}`;
      
      const evidenceData = insertTaskEvidenceSchema.parse({
        taskId,
        userId: (req.user as any).id,
        imageUrl,
        description: description || ""
      });
      
      const newEvidence = await storage.addTaskEvidence(evidenceData);
      res.status(201).json(newEvidence);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to add task evidence" });
    }
  });

  app.get("/api/tasks/:id/evidence", isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const evidence = await storage.getTaskEvidence(taskId);
      res.json(evidence);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task evidence" });
    }
  });

  // Feature routes
  app.post("/api/features", isAuthenticated, async (req, res) => {
    try {
      const featureData = insertFeatureSchema.parse({
        ...req.body,
        createdBy: (req.user as any).id
      });
      
      const newFeature = await storage.createFeature(featureData);
      res.status(201).json(newFeature);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create feature" });
    }
  });

  app.get("/api/features", isAuthenticated, async (req, res) => {
    try {
      const features = await storage.getAllFeatures();
      res.json(features);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch features" });
    }
  });

  app.put("/api/features/:id", isAuthenticated, async (req, res) => {
    try {
      const featureId = parseInt(req.params.id);
      const feature = await storage.getFeature(featureId);
      
      if (!feature) {
        return res.status(404).json({ message: "Feature not found" });
      }
      
      // Check permissions - only creator or supervisor can update
      const user = req.user as any;
      if (feature.createdBy !== user.id && user.role !== "Supervisor") {
        return res.status(403).json({ message: "You don't have permission to update this feature" });
      }
      
      const updatedFeature = await storage.updateFeature(featureId, req.body);
      res.json(updatedFeature);
    } catch (error) {
      res.status(500).json({ message: "Failed to update feature" });
    }
  });

  app.delete("/api/features/:id", isAuthenticated, async (req, res) => {
    try {
      const featureId = parseInt(req.params.id);
      const feature = await storage.getFeature(featureId);
      
      if (!feature) {
        return res.status(404).json({ message: "Feature not found" });
      }
      
      // Check permissions - only creator or supervisor can delete
      const user = req.user as any;
      if (feature.createdBy !== user.id && user.role !== "Supervisor") {
        return res.status(403).json({ message: "You don't have permission to delete this feature" });
      }
      
      const deleted = await storage.deleteFeature(featureId);
      if (deleted) {
        res.json({ message: "Feature deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete feature" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete feature" });
    }
  });

  // Boundary routes
  app.post("/api/boundaries", isSupervisor, async (req, res) => {
    try {
      const boundaryData = insertBoundarySchema.parse(req.body);
      const newBoundary = await storage.createBoundary(boundaryData);
      res.status(201).json(newBoundary);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create boundary" });
    }
  });

  app.get("/api/boundaries", isAuthenticated, async (req, res) => {
    try {
      const boundaries = await storage.getAllBoundaries();
      res.json(boundaries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch boundaries" });
    }
  });

  app.put("/api/boundaries/:id/status", isSupervisor, async (req, res) => {
    try {
      const boundaryId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const updatedBoundary = await storage.updateBoundaryStatus(boundaryId, status);
      res.json(updatedBoundary);
    } catch (error) {
      res.status(500).json({ message: "Failed to update boundary status" });
    }
  });

  app.put("/api/boundaries/:id/assign", isSupervisor, async (req, res) => {
    try {
      const boundaryId = parseInt(req.params.id);
      const { assignedTo } = req.body;
      
      if (!assignedTo) {
        return res.status(400).json({ message: "AssignedTo is required" });
      }
      
      const updatedBoundary = await storage.assignBoundary(boundaryId, assignedTo);
      res.json(updatedBoundary);
    } catch (error) {
      res.status(500).json({ message: "Failed to assign boundary" });
    }
  });

  // Team management routes
  app.post("/api/teams", isAuthenticated, async (req, res) => {
    try {
      const teamData = insertTeamSchema.parse(req.body);
      // Set the creator to the current user
      teamData.createdBy = (req.user as any).id;
      
      // If supervisor creates team, it's automatically approved
      if ((req.user as any).role === "Supervisor") {
        teamData.status = "Approved";
      }
      
      const newTeam = await storage.createTeam(teamData);
      res.status(201).json(newTeam);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  // Allow public access to teams for registration purposes
  app.get("/api/teams", async (req, res) => {
    try {
      const teams = await storage.getAllTeams();
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: "Failed to get teams" });
    }
  });

  app.get("/api/teams/:id", isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      res.status(500).json({ message: "Failed to get team" });
    }
  });

  app.patch("/api/teams/:id/status", isSupervisor, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!["Pending", "Approved", "Rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      const updatedTeam = await storage.updateTeamStatus(
        teamId, 
        status, 
        status === "Approved" ? (req.user as any).id : undefined
      );
      
      res.json(updatedTeam);
    } catch (error) {
      res.status(500).json({ message: "Failed to update team status" });
    }
  });

  app.get("/api/teams/:id/members", isAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      const members = await storage.getUsersByTeam(teamId);
      // Remove passwords from response
      const membersResponse = members.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(membersResponse);
    } catch (error) {
      res.status(500).json({ message: "Failed to get team members" });
    }
  });

  app.post("/api/users/:id/assign-team", isSupervisor, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { teamId } = req.body;
      
      if (!teamId) {
        return res.status(400).json({ message: "Team ID is required" });
      }
      
      const updatedUser = await storage.assignUserToTeam(userId, teamId);
      const { password, ...userResponse } = updatedUser;
      
      res.json(userResponse);
    } catch (error) {
      res.status(500).json({ message: "Failed to assign user to team" });
    }
  });

  return httpServer;
}

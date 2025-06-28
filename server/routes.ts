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
  insertTaskSubmissionSchema,
  insertTeamSchema,
  isValidObjectId,
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
    fileSize: 10 * 1024 * 1024, // 10MB limit for submissions
  },
  fileFilter: (req, file, cb) => {
    // Accept images, PDFs, and documents
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const allowedMimes = /image\/|application\/pdf|application\/msword|application\/vnd.openxmlformats-officedocument.wordprocessingml.document|text\/plain/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedMimes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only images, PDFs, and documents are allowed"));
    }
  },
});

// Configure multer for feature images (up to 10 images)
const featureImageUpload = multer({
  storage: storage_multer,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per image
    files: 10, // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    // Accept only images for features
    const allowedTypes = /jpeg|jpg|png|gif|webp|bmp/;
    const allowedMimes = /image\/(jpeg|jpg|png|gif|webp|bmp)/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedMimes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed (JPEG, PNG, GIF, WebP, BMP)"));
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
    }),
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
        await storage.updateUserLastActive(user._id.toString());

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user: any, done) => {
    done(null, user._id.toString());
  });

  passport.deserializeUser(async (id: string, done) => {
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
    res
      .status(403)
      .json({ message: "Access denied: Supervisor role required" });
  };

  // Middleware to validate ObjectId
  const validateObjectId = (paramName: string) => {
    return (req: Request, res: Response, next: any) => {
      const id = req.params[paramName];
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: `Invalid ${paramName} format` });
      }
      next();
    };
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
        if (!isValidObjectId(userData.teamId)) {
          return res.status(400).json({ message: "Invalid team ID format" });
        }

        const team = await storage.getTeam(userData.teamId);
        if (!team) {
          return res.status(400).json({ message: "Team does not exist" });
        }
        if (team.status !== "Approved") {
          return res
            .status(400)
            .json({ message: "Team is not approved for registration" });
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
      console.error("Create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.get("/api/users/field", isAuthenticated, async (req, res) => {
    try {
      const fieldUsers = await storage.getAllFieldUsers();
      // Remove passwords from response
      const usersResponse = fieldUsers.map((user) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(usersResponse);
    } catch (error) {
      console.error("Get field users error:", error);
      res.status(500).json({ message: "Failed to fetch field users" });
    }
  });

  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      // Get all users (field users + supervisors)
      const fieldUsers = await storage.getAllFieldUsers();
      
      // Get supervisor users by finding users with role "Supervisor"
      const allUsers = [...fieldUsers];
      
      // Try to find supervisors - we know there's at least the one created in initial data
      // For now, we'll fetch by trying common supervisor usernames or IDs
      try {
        const supervisor = await storage.getUserByUsername("supervisor");
        if (supervisor && !allUsers.find(u => u._id.toString() === supervisor._id.toString())) {
          allUsers.push(supervisor);
        }
      } catch (e) {
        // Supervisor might not exist or have different username
      }
      
      // Remove passwords from response
      const usersResponse = allUsers.map((user) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(usersResponse);
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users/location", isAuthenticated, async (req, res) => {
    try {
      const { lat, lng } = req.body;
      if (!lat || !lng) {
        return res
          .status(400)
          .json({ message: "Latitude and longitude are required" });
      }

      const updatedUser = await storage.updateUserLocation(
        (req.user as any)._id.toString(),
        { lat, lng },
      );
      const userResponse = { ...updatedUser };
      delete userResponse.password;
      res.json(userResponse);
    } catch (error) {
      console.error("Update location error:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  // Task routes
  app.post("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      taskData.createdBy = (req.user as any)._id.toString();

      const newTask = await storage.createTask(taskData);
      res.status(201).json(newTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("Create task error:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.get("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      let tasks;
      
      if (user.role === "Supervisor") {
        // Supervisors can see all tasks - ensure this always returns all data
        tasks = await storage.getAllTasks();
      } else {
        // Field users can only see tasks assigned to them or their team
        const userTasks = await storage.getTasksByAssignee(user._id.toString());
        let teamTasks: any[] = [];
        
        if (user.teamId) {
          // Get tasks assigned to the team directly (using team ID as assignedTo)
          const allTasks = await storage.getAllTasks();
          teamTasks = allTasks.filter(task => 
            task.assignedTo?.toString() === user.teamId.toString()
          );
          
          console.log(`Field user ${user.username} (team: ${user.teamId})`);
          console.log(`Found ${userTasks.length} user tasks, ${teamTasks.length} team tasks`);
        }
        
        // Combine and deduplicate tasks
        const taskMap = new Map();
        [...userTasks, ...teamTasks].forEach(task => {
          taskMap.set(task._id.toString(), task);
        });
        tasks = Array.from(taskMap.values());
        
        console.log(`Returning ${tasks.length} tasks for field user ${user.username}`);
      }
      
      res.json(tasks);
    } catch (error) {
      console.error("Get all tasks error:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/my-tasks", isAuthenticated, async (req, res) => {
    try {
      const tasks = await storage.getTasksByAssignee(
        (req.user as any)._id.toString(),
      );
      res.json(tasks);
    } catch (error) {
      console.error("Get my tasks error:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.put(
    "/api/tasks/:id/status",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const taskId = req.params.id;
        const { status } = req.body;

        if (!status) {
          return res.status(400).json({ message: "Status is required" });
        }

        const updatedTask = await storage.updateTaskStatus(
          taskId,
          status,
          (req.user as any)._id.toString(),
        );
        res.json(updatedTask);
      } catch (error) {
        console.error("Update task status error:", error);
        res.status(500).json({ message: "Failed to update task status" });
      }
    },
  );

  app.put(
    "/api/tasks/:id/assign",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const taskId = req.params.id;
        const { assignedTo } = req.body;

        if (!assignedTo) {
          return res.status(400).json({ message: "AssignedTo is required" });
        }

        if (!isValidObjectId(assignedTo)) {
          return res
            .status(400)
            .json({ message: "Invalid assignedTo ID format" });
        }

        const updatedTask = await storage.assignTask(taskId, assignedTo);
        res.json(updatedTask);
      } catch (error) {
        console.error("Assign task error:", error);
        res.status(500).json({ message: "Failed to assign task" });
      }
    },
  );

  app.delete(
    "/api/tasks/:id",
    isAuthenticated,
    isSupervisor,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const taskId = req.params.id;
        const deleted = await storage.deleteTask(taskId);
        
        if (deleted) {
          res.json({ message: "Task deleted successfully" });
        } else {
          res.status(404).json({ message: "Task not found" });
        }
      } catch (error) {
        console.error("Delete task error:", error);
        res.status(500).json({ message: "Failed to delete task" });
      }
    },
  );

  // Task updates routes
  app.post(
    "/api/tasks/:id/updates",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const taskId = req.params.id;
        const updateData = insertTaskUpdateSchema.parse({
          ...req.body,
          taskId,
          userId: (req.user as any)._id.toString(),
        });

        const newUpdate = await storage.createTaskUpdate(updateData);
        res.status(201).json(newUpdate);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: error.errors });
        }
        console.error("Create task update error:", error);
        res.status(500).json({ message: "Failed to create task update" });
      }
    },
  );

  app.get(
    "/api/tasks/:id/updates",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const taskId = req.params.id;
        const updates = await storage.getTaskUpdates(taskId);
        res.json(updates);
      } catch (error) {
        console.error("Get task updates error:", error);
        res.status(500).json({ message: "Failed to fetch task updates" });
      }
    },
  );

  // Task evidence routes
  app.post(
    "/api/tasks/:id/evidence",
    isAuthenticated,
    validateObjectId("id"),
    upload.single("image"),
    async (req, res) => {
      try {
        const taskId = req.params.id;
        const { description } = req.body;

        if (!req.file) {
          return res.status(400).json({ message: "Image file is required" });
        }

        const imageUrl = `/uploads/${req.file.filename}`;

        const evidenceData = insertTaskEvidenceSchema.parse({
          taskId,
          userId: (req.user as any)._id.toString(),
          imageUrl,
          description: description || "",
        });

        const newEvidence = await storage.addTaskEvidence(evidenceData);
        res.status(201).json(newEvidence);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: error.errors });
        }
        console.error("Add task evidence error:", error);
        res.status(500).json({ message: "Failed to add task evidence" });
      }
    },
  );

  app.get(
    "/api/tasks/:id/evidence",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const taskId = req.params.id;
        const evidence = await storage.getTaskEvidence(taskId);
        res.json(evidence);
      } catch (error) {
        console.error("Get task evidence error:", error);
        res.status(500).json({ message: "Failed to fetch task evidence" });
      }
    },
  );

  // Feature routes
  app.post("/api/features", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Field users can only create features within their assigned boundaries
      if (user.role === "Field") {
        if (!req.body.boundaryId) {
          return res.status(403).json({ message: "Field users must specify a boundary for feature creation" });
        }
        
        const boundary = await storage.getBoundary(req.body.boundaryId);
        if (!boundary || boundary.assignedTo?.toString() !== user.teamId?.toString()) {
          return res.status(403).json({ message: "Cannot create features outside assigned parcel area" });
        }
        
        // Add team ID to feature for proper filtering
        req.body.teamId = user.teamId;
      }
      // Supervisors can create features anywhere without boundary restrictions
      
      const featureData = insertFeatureSchema.parse({
        ...req.body,
        createdBy: user._id.toString(),
      });

      const newFeature = await storage.createFeature(featureData);
      res.status(201).json(newFeature);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("Create feature error:", error);
      res.status(500).json({ message: "Failed to create feature" });
    }
  });

  app.get("/api/features", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      let features;
      
      if (user.role === "Supervisor") {
        // Supervisors can see all features - ensure this always returns all data
        features = await storage.getAllFeatures();
      } else {
        // Field users can only see features within their assigned boundaries
        if (user.teamId) {
          // Get assigned boundaries for the team
          const allBoundaries = await storage.getAllBoundaries();
          const teamBoundaries = allBoundaries.filter(
            boundary => boundary.assignedTo?.toString() === user.teamId?.toString()
          );
          
          // If team has assigned boundaries, only show features within those boundaries
          if (teamBoundaries.length > 0) {
            const allFeatures = await storage.getAllFeatures();
            // For now, show features created by the team or within their assigned area
            features = allFeatures.filter(feature => {
              // Include features created by team members or within assigned boundaries
              return feature.teamId?.toString() === user.teamId?.toString();
            });
          } else {
            features = [];
          }
        } else {
          features = [];
        }
      }
      
      res.json(features);
    } catch (error) {
      console.error("Get features error:", error);
      res.status(500).json({ message: "Failed to fetch features" });
    }
  });

  app.put(
    "/api/features/:id",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const featureId = req.params.id;
        const feature = await storage.getFeature(featureId);

        if (!feature) {
          return res.status(404).json({ message: "Feature not found" });
        }

        // Check permissions - only creator or supervisor can update
        const user = req.user as any;
        if (
          feature.createdBy?.toString() !== user._id.toString() &&
          user.role !== "Supervisor"
        ) {
          return res
            .status(403)
            .json({
              message: "You don't have permission to update this feature",
            });
        }

        const updatedFeature = await storage.updateFeature(featureId, req.body);
        res.json(updatedFeature);
      } catch (error) {
        console.error("Update feature error:", error);
        res.status(500).json({ message: "Failed to update feature" });
      }
    },
  );

  app.delete(
    "/api/features/:id",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const featureId = req.params.id;
        const feature = await storage.getFeature(featureId);

        if (!feature) {
          return res.status(404).json({ message: "Feature not found" });
        }

        // Check permissions - only creator or supervisor can delete
        const user = req.user as any;
        if (
          feature.createdBy?.toString() !== user._id.toString() &&
          user.role !== "Supervisor"
        ) {
          return res
            .status(403)
            .json({
              message: "You don't have permission to delete this feature",
            });
        }

        const deleted = await storage.deleteFeature(featureId);
        if (deleted) {
          res.json({ message: "Feature deleted successfully" });
        } else {
          res.status(500).json({ message: "Failed to delete feature" });
        }
      } catch (error) {
        console.error("Delete feature error:", error);
        res.status(500).json({ message: "Failed to delete feature" });
      }
    },
  );

  app.put(
    "/api/features/:id/assign",
    isAuthenticated,
    isSupervisor,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const featureId = req.params.id;
        const { teamId } = req.body;

        if (!teamId) {
          return res.status(400).json({ message: "Team ID is required" });
        }

        const feature = await storage.getFeature(featureId);
        if (!feature) {
          return res.status(404).json({ message: "Feature not found" });
        }

        const team = await storage.getTeam(teamId);
        if (!team) {
          return res.status(404).json({ message: "Team not found" });
        }

        // Update feature with assigned team
        const updatedFeature = await storage.updateFeature(featureId, {
          assignedTo: teamId,
          feaStatus: "Assigned"
        });

        res.json(updatedFeature);
      } catch (error) {
        console.error("Assign feature to team error:", error);
        res.status(500).json({ message: "Failed to assign feature to team" });
      }
    },
  );

  // Feature image upload endpoint
  app.post(
    "/api/features/upload-images",
    isAuthenticated,
    featureImageUpload.array('images', 10),
    async (req, res) => {
      try {
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({ message: "No images uploaded" });
        }

        const files = req.files as Express.Multer.File[];
        const imagePaths = files.map(file => `/uploads/${file.filename}`);

        res.json({ 
          message: "Images uploaded successfully",
          images: imagePaths 
        });
      } catch (error) {
        console.error("Feature image upload error:", error);
        res.status(500).json({ message: "Failed to upload images" });
      }
    }
  );

  // Feature status update
  app.patch(
    "/api/features/:id/status",
    isSupervisor,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const featureId = req.params.id;
        const { status } = req.body;

        if (!status) {
          return res.status(400).json({ message: "Status is required" });
        }

        const feature = await storage.getFeature(featureId);
        if (!feature) {
          return res.status(404).json({ message: "Feature not found" });
        }

        // Update feature status
        const updatedFeature = await storage.updateFeature(featureId, {
          feaStatus: status
        });

        res.json(updatedFeature);
      } catch (error) {
        console.error("Update feature status error:", error);
        res.status(500).json({ message: "Failed to update feature status" });
      }
    },
  );

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
      console.error("Create boundary error:", error);
      res.status(500).json({ message: "Failed to create boundary" });
    }
  });

  app.get("/api/boundaries", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      let boundaries;
      
      if (user.role === "Supervisor") {
        // Supervisors can see all boundaries - ensure this always returns all data
        boundaries = await storage.getAllBoundaries();
      } else {
        // Field users can only see boundaries assigned to their team
        const allBoundaries = await storage.getAllBoundaries();
        boundaries = allBoundaries.filter(
          boundary => boundary.assignedTo?.toString() === user.teamId?.toString()
        );
      }
      
      res.json(boundaries);
    } catch (error) {
      console.error("Get boundaries error:", error);
      res.status(500).json({ message: "Failed to fetch boundaries" });
    }
  });

  app.put(
    "/api/boundaries/:id/status",
    isSupervisor,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const boundaryId = req.params.id;
        const { status } = req.body;

        if (!status) {
          return res.status(400).json({ message: "Status is required" });
        }

        const updatedBoundary = await storage.updateBoundaryStatus(
          boundaryId,
          status,
        );
        res.json(updatedBoundary);
      } catch (error) {
        console.error("Update boundary status error:", error);
        res.status(500).json({ message: "Failed to update boundary status" });
      }
    },
  );

  app.put(
    "/api/boundaries/:id/assign",
    isSupervisor,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const boundaryId = req.params.id;
        const { teamId } = req.body;

        if (!teamId) {
          return res.status(400).json({ message: "Team ID is required" });
        }

        const boundary = await storage.getBoundary(boundaryId);
        if (!boundary) {
          return res.status(404).json({ message: "Boundary not found" });
        }

        const team = await storage.getTeam(teamId);
        if (!team) {
          return res.status(404).json({ message: "Team not found" });
        }

        const updatedBoundary = await storage.assignBoundary(
          boundaryId,
          teamId,
        );
        res.json(updatedBoundary);
      } catch (error) {
        console.error("Assign boundary to team error:", error);
        res.status(500).json({ message: "Failed to assign boundary to team" });
      }
    },
  );

  // Team management routes
  app.post("/api/teams", isAuthenticated, async (req, res) => {
    try {
      const teamData = insertTeamSchema.parse(req.body);
      // Set the creator to the current user
      teamData.createdBy = (req.user as any)._id.toString();

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
      console.error("Create team error:", error);
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  // Allow public access to teams for registration purposes
  app.get("/api/teams", async (req, res) => {
    try {
      const teams = await storage.getAllTeams();
      res.json(teams);
    } catch (error) {
      console.error("Get teams error:", error);
      res.status(500).json({ message: "Failed to get teams" });
    }
  });

  app.get(
    "/api/teams/:id",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const teamId = req.params.id;
        const team = await storage.getTeam(teamId);
        if (!team) {
          return res.status(404).json({ message: "Team not found" });
        }
        res.json(team);
      } catch (error) {
        console.error("Get team error:", error);
        res.status(500).json({ message: "Failed to get team" });
      }
    },
  );

  app.get(
    "/api/teams/:id/users",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const teamId = req.params.id;
        const users = await storage.getUsersByTeam(teamId);
        // Remove passwords from response
        const usersResponse = users.map((user) => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        });
        res.json(usersResponse);
      } catch (error) {
        console.error("Get users by team error:", error);
        res.status(500).json({ message: "Failed to get team users" });
      }
    },
  );

  app.patch(
    "/api/teams/:id/status",
    isSupervisor,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const teamId = req.params.id;
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
          status === "Approved" ? (req.user as any)._id.toString() : undefined,
        );

        res.json(updatedTeam);
      } catch (error) {
        console.error("Update team status error:", error);
        res.status(500).json({ message: "Failed to update team status" });
      }
    },
  );

  app.get(
    "/api/teams/:id/members",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const teamId = req.params.id;
        const team = await storage.getTeam(teamId);
        if (!team) {
          return res.status(404).json({ message: "Team not found" });
        }

        const members = await storage.getUsersByTeam(teamId);
        // Remove passwords from response
        const membersResponse = members.map((user) => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        });

        res.json(membersResponse);
      } catch (error) {
        console.error("Get team members error:", error);
        res.status(500).json({ message: "Failed to get team members" });
      }
    },
  );

  app.post(
    "/api/users/:id/assign-team",
    isSupervisor,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const userId = req.params.id;
        const { teamId } = req.body;

        if (!teamId) {
          return res.status(400).json({ message: "Team ID is required" });
        }

        if (!isValidObjectId(teamId)) {
          return res.status(400).json({ message: "Invalid team ID format" });
        }

        const updatedUser = await storage.assignUserToTeam(userId, teamId);
        const { password, ...userResponse } = updatedUser;

        res.json(userResponse);
      } catch (error) {
        console.error("Assign user to team error:", error);
        res.status(500).json({ message: "Failed to assign user to team" });
      }
    },
  );

  // Task routes
  app.post("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      console.log("Task creation request body:", req.body);
      
      // Transform data before validation
      const transformedData = {
        ...req.body,
        createdBy: (req.user as any)._id.toString(),
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      };
      
      // Remove undefined fields for clean validation
      Object.keys(transformedData).forEach(key => {
        if (transformedData[key] === undefined) {
          delete transformedData[key];
        }
      });

      console.log("Transformed task data:", transformedData);
      const newTask = await storage.createTask(transformedData);
      res.status(201).json(newTask);
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // Additional MongoDB-specific routes for enhanced functionality

  // Geospatial routes
  app.get("/api/users/nearby", isAuthenticated, async (req, res) => {
    try {
      const { lng, lat, maxDistance = 1000 } = req.query;

      if (!lng || !lat) {
        return res
          .status(400)
          .json({ message: "Longitude and latitude are required" });
      }

      const nearbyUsers = await storage.getUsersNearLocation(
        parseFloat(lng as string),
        parseFloat(lat as string),
        parseInt(maxDistance as string),
      );

      // Remove passwords from response
      const usersResponse = nearbyUsers.map((user) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      res.json(usersResponse);
    } catch (error) {
      console.error("Get nearby users error:", error);
      res.status(500).json({ message: "Failed to get nearby users" });
    }
  });

  app.get(
    "/api/boundaries/:id/features",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const boundaryId = req.params.id;
        const features = await storage.getFeaturesInBoundary(boundaryId);
        res.json(features);
      } catch (error) {
        console.error("Get features in boundary error:", error);
        res.status(500).json({ message: "Failed to get features in boundary" });
      }
    },
  );

  app.get(
    "/api/boundaries/:id/tasks",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const boundaryId = req.params.id;
        const tasks = await storage.getTasksInBoundary(boundaryId);
        res.json(tasks);
      } catch (error) {
        console.error("Get tasks in boundary error:", error);
        res.status(500).json({ message: "Failed to get tasks in boundary" });
      }
    },
  );

  // Analytics routes
  app.get("/api/analytics/task-stats", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.query;

      if (!userId || !isValidObjectId(userId as string)) {
        return res.status(400).json({ message: "Valid user ID is required" });
      }

      const stats = await storage.getTaskStatsByUser(userId as string);
      res.json(stats);
    } catch (error) {
      console.error("Get task stats error:", error);
      res.status(500).json({ message: "Failed to get task statistics" });
    }
  });

  app.get("/api/analytics/feature-stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getFeatureStatsByType();
      res.json(stats);
    } catch (error) {
      console.error("Get feature stats error:", error);
      res.status(500).json({ message: "Failed to get feature statistics" });
    }
  });

  // Search routes
  app.get("/api/search/features", isAuthenticated, async (req, res) => {
    try {
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const features = await storage.searchFeatures(q as string);
      res.json(features);
    } catch (error) {
      console.error("Search features error:", error);
      res.status(500).json({ message: "Failed to search features" });
    }
  });

  app.get("/api/search/tasks", isAuthenticated, async (req, res) => {
    try {
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const tasks = await storage.searchTasks(q as string);
      res.json(tasks);
    } catch (error) {
      console.error("Search tasks error:", error);
      res.status(500).json({ message: "Failed to search tasks" });
    }
  });

  // Task submission routes
  app.post(
    "/api/tasks/:taskId/submissions",
    isAuthenticated,
    upload.single("file"),
    validateObjectId("taskId"),
    async (req, res) => {
      try {
        const taskId = req.params.taskId;
        const user = req.user as any;
        const { description } = req.body;

        if (!req.file) {
          return res.status(400).json({ message: "File is required" });
        }

        // Verify task exists and user has access
        const task = await storage.getTask(taskId);
        if (!task) {
          return res.status(404).json({ message: "Task not found" });
        }

        // Check if user is assigned to this task or is on the team
        if (user.role !== "Supervisor" && task.assignedTo?.toString() !== user.teamId?.toString()) {
          return res.status(403).json({ message: "Not authorized to submit for this task" });
        }

        const submissionData = {
          taskId: taskId,
          userId: user._id.toString(),
          teamId: user.teamId?.toString() || undefined,
          fileName: req.file.originalname,
          fileUrl: `/uploads/${req.file.filename}`,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
          description: description || "",
          submissionStatus: "Pending" as const,
        };

        const submission = await storage.createTaskSubmission(submissionData);
        res.status(201).json(submission);
      } catch (error) {
        console.error("Create task submission error:", error);
        res.status(500).json({ message: "Failed to create task submission" });
      }
    }
  );

  app.get(
    "/api/tasks/:taskId/submissions",
    isAuthenticated,
    validateObjectId("taskId"),
    async (req, res) => {
      try {
        const taskId = req.params.taskId;
        const submissions = await storage.getTaskSubmissions(taskId);
        res.json(submissions);
      } catch (error) {
        console.error("Get task submissions error:", error);
        res.status(500).json({ message: "Failed to get task submissions" });
      }
    }
  );

  app.get(
    "/api/teams/:teamId/submissions",
    isAuthenticated,
    isSupervisor,
    validateObjectId("teamId"),
    async (req, res) => {
      try {
        const teamId = req.params.teamId;
        const submissions = await storage.getTaskSubmissionsByTeam(teamId);
        res.json(submissions);
      } catch (error) {
        console.error("Get team submissions error:", error);
        res.status(500).json({ message: "Failed to get team submissions" });
      }
    }
  );

  app.patch(
    "/api/submissions/:submissionId/status",
    isAuthenticated,
    isSupervisor,
    validateObjectId("submissionId"),
    async (req, res) => {
      try {
        const submissionId = req.params.submissionId;
        const { status, reviewComments } = req.body;
        const user = req.user as any;

        if (!status) {
          return res.status(400).json({ message: "Status is required" });
        }

        const submission = await storage.updateSubmissionStatus(
          submissionId,
          status,
          user._id.toString(),
          reviewComments
        );
        res.json(submission);
      } catch (error) {
        console.error("Update submission status error:", error);
        res.status(500).json({ message: "Failed to update submission status" });
      }
    }
  );

  // Bulk operations routes
  app.patch("/api/tasks/bulk-status", isAuthenticated, async (req, res) => {
    try {
      const { taskIds, status } = req.body;

      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ message: "Task IDs array is required" });
      }

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      // Validate all task IDs
      const invalidIds = taskIds.filter((id) => !isValidObjectId(id));
      if (invalidIds.length > 0) {
        return res
          .status(400)
          .json({ message: "Invalid task ID format", invalidIds });
      }

      const updatedCount = await storage.bulkUpdateTaskStatus(taskIds, status);
      res.json({ message: `Updated ${updatedCount} tasks`, updatedCount });
    } catch (error) {
      console.error("Bulk update task status error:", error);
      res.status(500).json({ message: "Failed to bulk update task status" });
    }
  });

  return httpServer;
}

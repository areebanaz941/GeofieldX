import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import session from "express-session";
import { v4 as uuidv4 } from "uuid";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadBufferToGridFS, openGridFSDownloadStream, getGridFSFileInfo, deleteGridFSFile } from "./gridfs";
import {
  insertUserSchema,
  insertTaskSchema,
  insertFeatureSchema,
  insertBoundarySchema,
  insertTaskUpdateSchema,
  insertTaskEvidenceSchema,
  insertTaskSubmissionSchema,
  insertTeamSchema,
  insertFeatureTemplateSchema,
  FeatureTemplate,
  isValidObjectId,
} from "@shared/schema";
import { z } from "zod";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || "geofield-jwt-secret-key-2024";
const JWT_EXPIRES_IN = "24h";

// Helper function to generate JWT token
function generateJWTToken(user: any) {
  return jwt.sign(
    { 
      userId: user._id.toString(), 
      username: user.username, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Helper function to verify JWT token
function verifyJWTToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Helper function to check if a point is inside a polygon using ray casting algorithm
function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [x, y] = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

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

// Memory storage for images that will be stored in MongoDB GridFS
const memoryStorage = multer.memoryStorage();

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
    fileSize: 10 * 1024 * 1024, // 10MB per image
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

// Configure multer for shapefile uploads
const uploadImages = multer({
  storage: storage_multer,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for shapefiles
  },
  fileFilter: (req, file, cb) => {
    // Accept ZIP files for shapefiles and individual SHP components
    const allowedTypes = /zip|shp|shx|dbf|prj|cpg/;
    const allowedMimes = /application\/zip|application\/x-zip-compressed|application\/octet-stream/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedMimes.test(file.mimetype) || file.mimetype === 'application/x-esri-shape';

    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only shapefile formats are allowed (ZIP, SHP, SHX, DBF, PRJ, CPG)"));
    }
  },
});

// Memory-based uploaders for GridFS-backed image uploads
const memoryImageUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per image
    files: 10,
  },
  fileFilter: (req, file, cb) => {
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

const memorySingleImageUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = /image\/(jpeg|jpg|png|gif|webp|bmp)/;
    if (allowedMimes.test(file.mimetype)) return cb(null, true);
    cb(new Error("Only image files are allowed"));
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Session setup with debugging for production
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "geowhats-secret-key-production-2024",
      resave: false, // Changed back to false to prevent unnecessary saves
      saveUninitialized: false, // Changed back to false to prevent creating sessions for unauthenticated users
      store: new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      cookie: {
        secure: process.env.NODE_ENV === "production", // Re-enabled for proper HTTPS handling
        httpOnly: true, // Re-enabled for security
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax', // More permissive for cross-origin in production
      },
      name: 'geofieldx.session',
      rolling: true, // Extend session on each request
    }),
  );

  // Debug middleware to log session info
  app.use((req: any, res: any, next: any) => {
    if (req.path.startsWith('/api/')) {
      console.log(`🔍 [${req.method}] ${req.path} - Session ID: ${req.sessionID || 'none'}, Auth: ${req.isAuthenticated ? req.isAuthenticated() : 'unknown'}`);
    }
    next();
  });

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
      console.log(`🔍 Deserializing user with ID: ${id}`);
      const user = await storage.getUser(id);
      if (user) {
        console.log(`✅ User deserialized successfully: ${user.username} (role: ${user.role})`);
        done(null, user);
      } else {
        console.log(`❌ User not found during deserialization: ${id}`);
        done(null, false);
      }
    } catch (error) {
      console.error(`❌ Error during user deserialization for ID ${id}:`, error);
      done(error);
    }
  });

  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(path.join(process.cwd(), "uploads"))) {
    fs.mkdirSync(path.join(process.cwd(), "uploads"), { recursive: true });
  }

  // Serve static uploads with no-cache to ensure fresh image reloads
  app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "uploads"), {
      etag: true,
      lastModified: true,
      setHeaders: (res) => {
        // Prevent aggressive caching by proxies/browsers during frequent updates
        res.setHeader("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      },
    }),
  );

  // Hybrid authentication middleware: tries session first, then JWT
  const isAuthenticated = async (req: Request, res: Response, next: any) => {
    // Try session authentication first
    if (req.isAuthenticated()) {
      console.log(`✅ Session auth success for ${req.path}: User=${(req as any).user._id}`);
      return next();
    }
    
    // Fallback to JWT authentication
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (token) {
      console.log(`🔍 Attempting JWT authentication for ${req.path}`);
      const decoded = verifyJWTToken(token);
      if (decoded && typeof decoded === 'object' && 'userId' in decoded) {
        try {
          const user = await storage.getUser(decoded.userId as string);
          if (user) {
            (req as any).user = user;
            console.log(`✅ JWT auth success for ${req.path}: User=${user.username} (role: ${user.role})`);
            return next();
          } else {
            console.log(`❌ JWT auth failed - user not found: ${decoded.userId}`);
          }
        } catch (error) {
          console.log(`❌ JWT user lookup failed for ${decoded.userId}:`, error);
        }
      } else {
        console.log(`❌ JWT token invalid or malformed for ${req.path}`);
      }
    }
    
    console.log(`❌ Authentication failed for ${req.path}: No valid session or JWT`);
    res.status(401).json({ message: "Not authenticated" });
  };

  // Middleware to check if user is supervisor (works with hybrid auth)
  const isSupervisor = async (req: Request, res: Response, next: any) => {
    // First ensure user is authenticated via hybrid auth
    await isAuthenticated(req, res, () => {
      // Check if user has supervisor role
      if ((req as any).user && (req as any).user.role === "Supervisor") {
        return next();
      }
      res
        .status(403)
        .json({ message: "Access denied: Supervisor role required" });
    });
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

  // Image upload endpoints
  // Image upload endpoint for feature creation (single) -> store in GridFS
  app.post("/api/upload/image", memorySingleImageUpload.single('image'), async (req: any, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const id = await uploadBufferToGridFS(req.file.buffer, req.file.originalname, req.file.mimetype);
      const url = `/api/images/${id}`;
      console.log("📸 Image stored in GridFS:", id, req.file.originalname);
      
      res.json({
        message: "Image uploaded successfully",
        id,
        url,
        originalName: req.file.originalname,
        size: req.file.size,
        contentType: req.file.mimetype,
      });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Multiple images upload endpoint for feature creation
  app.post("/api/features/upload-images", isAuthenticated, memoryImageUpload.array('images', 10), async (req: any, res: Response) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "No image files provided" });
      }

      const uploadedFiles = req.files as Express.Multer.File[];
      const imagePaths: string[] = [];
      for (const file of uploadedFiles) {
        const id = await uploadBufferToGridFS(file.buffer, file.originalname, file.mimetype);
        imagePaths.push(`/api/images/${id}`);
      }
      
      console.log("📸 Multiple images stored in GridFS:", imagePaths);
      
      res.json({
        message: "Images uploaded successfully",
        imagePaths: imagePaths,
        count: uploadedFiles.length
      });
    } catch (error) {
      console.error("Multiple images upload error:", error);
      res.status(500).json({ message: "Failed to upload images" });
    }
  });

  // Authentication routes with JWT token generation
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    const user = req.user as any;
    const token = generateJWTToken(user);
    
    console.log(`🔑 Login successful for user ${user.username}, generating JWT token`);
    
    res.json({ 
      user: user,
      token: token 
    });
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error during logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/current-user", isAuthenticated, async (req, res) => {
    try {
      const rawUser = (req.user as any);
      let user: any = rawUser && typeof rawUser.toObject === 'function' ? rawUser.toObject() : { ...rawUser };

      if (user) {
        delete user.password; // Don't send password to client
      }

      // If role is missing, attempt a safe refetch from storage and normalize
      if (!user?.role) {
        try {
          const refetched = await storage.getUser(
            rawUser?._id?.toString?.() || rawUser?._id || (rawUser?.id?.toString?.() ?? rawUser?.id)
          );
          if (refetched) {
            user = typeof (refetched as any).toObject === 'function'
              ? (refetched as any).toObject()
              : { ...(refetched as any) };
            delete user.password;
          }
        } catch (e) {
          console.warn('⚠️ Failed to refetch user during current-user handling:', e);
        }
      }

      // If we still don't have a role, treat as unauthenticated to avoid noisy 500s
      if (!user?.role) {
        console.warn('⚠️ User role missing after normalization; responding with 401. User:', {
          _id: user?._id,
          username: user?.username,
        });
        return res.status(401).json({ message: "Not authenticated" });
      }

      console.log(`✅ Current user response: ${user.username} (role: ${user.role})`);
      return res.json(user);
    } catch (error) {
      console.error('❌ Error generating current-user response:', error);
      return res.status(500).json({ message: "Failed to get current user" });
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
      const { password, ...safeUserResponse } = userResponse as any;
      res.status(201).json(safeUserResponse);
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
      const usersResponse = fieldUsers.map((user: any) => {
        const plainUser = typeof user?.toObject === "function" ? user.toObject() : user;
        const { password, ...userWithoutPassword } = plainUser;
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
        if (supervisor && !allUsers.find(u => (u as any)._id.toString() === supervisor._id.toString())) {
          allUsers.push(supervisor as any);
        }
      } catch (e) {
        // Supervisor might not exist or have different username
      }
      
      // Remove passwords from response
      const usersResponse = allUsers.map((user: any) => {
        const plainUser = typeof user?.toObject === "function" ? user.toObject() : user;
        const { password, ...userWithoutPassword } = plainUser;
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
      const { password, ...safeUserResponse } = userResponse as any;
      res.json(safeUserResponse);
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
    memorySingleImageUpload.single("image"),
    async (req, res) => {
      try {
        const taskId = req.params.id;
        const { description } = req.body;

        if (!req.file) {
          return res.status(400).json({ message: "Image file is required" });
        }

        const id = await uploadBufferToGridFS(req.file.buffer, req.file.originalname, req.file.mimetype);
        const imageUrl = `/api/images/${id}`;

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

  // Delete task evidence (and backing GridFS image)
  app.delete(
    "/api/tasks/:taskId/evidence/:evidenceId",
    isAuthenticated,
    validateObjectId("taskId"),
    validateObjectId("evidenceId"),
    async (req, res) => {
      try {
        const { taskId, evidenceId } = req.params as any;
        const success = await storage.deleteTaskEvidence(taskId, evidenceId);
        if (!success) {
          return res.status(404).json({ message: "Evidence not found" });
        }
        return res.json({ message: "Evidence deleted successfully" });
      } catch (error) {
        console.error("Delete task evidence error:", error);
        return res.status(500).json({ message: "Failed to delete task evidence" });
      }
    }
  );

  // Feature routes
  app.post("/api/features", isAuthenticated, memoryImageUpload.array('images', 10), async (req, res) => {
    try {
      const user = req.user as any;
      
      // Debug logging to check if images are being received
      // Normalize JSON-stringified fields (geometry) when sent as FormData
      if (typeof req.body.geometry === 'string') {
        try { req.body.geometry = JSON.parse(req.body.geometry); } catch {}
      }
      console.log("🎯 Feature creation request body:", req.body);
      console.log("📸 Images array received:", req.body.images);
      console.log("📸 Uploaded files:", req.files);
      
      // Process uploaded images
      let imagePaths: string[] = [];
      
      // Check if images are being uploaded as files (FormData)
      if (req.files && Array.isArray(req.files)) {
        const uploadedFiles = req.files as Express.Multer.File[];
        const paths: string[] = [];
        for (const file of uploadedFiles) {
          const id = await uploadBufferToGridFS(file.buffer, file.originalname, file.mimetype);
          paths.push(`/api/images/${id}`);
        }
        imagePaths = paths;
        console.log("📸 Processed image paths from GridFS:", imagePaths);
      }
      // Check if images are already uploaded and passed as paths in the body
      else if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
        imagePaths = req.body.images.filter((p: string) => typeof p === 'string' && (p.startsWith('/api/images/') || p.startsWith('api/images/') || p.startsWith('/uploads/') || p.startsWith('uploads/')))
          .map((p: string) => p.startsWith('api/images/') ? `/${p}` : (p.startsWith('uploads/') ? `/${p}` : p));
        console.log("📸 Using existing image paths from body:", imagePaths);
      }
      
      // Field users can only create features within their assigned boundaries
      if (user.role === "Field") {
        // If supervisor is creating, skip boundary restriction
        // Get all boundaries assigned to the user's team
        const allBoundaries = await storage.getAllBoundaries();
        // Handle both populated `assignedTo` objects and raw ObjectId/string values
        const assignedBoundaries = allBoundaries.filter((boundary: any) => {
          const assigned = boundary?.assignedTo;
          if (!assigned || !user.teamId) return false;
          const assignedId = typeof assigned === 'object' ? assigned._id?.toString?.() : assigned?.toString?.();
          return assignedId === user.teamId.toString();
        });
        
        if (assignedBoundaries.length === 0) {
          return res.status(403).json({ message: "No boundaries assigned to your team" });
        }
        
        // Check if the feature geometry is within any assigned boundary
        let isWithinBoundary = false;
        const featureGeometry = req.body.geometry;
        
        if (featureGeometry) {
          for (const boundary of assignedBoundaries) {
            if (boundary.geometry) {
              try {
                const boundaryGeom = typeof boundary.geometry === 'string' 
                  ? JSON.parse(boundary.geometry) 
                  : boundary.geometry;
                
                if (boundaryGeom.type === "Polygon" && featureGeometry.type === "Polygon") {
                  // Check if polygon is within boundary (simplified check)
                  const featureCoords = featureGeometry.coordinates[0];
                  const boundaryCoords = boundaryGeom.coordinates[0];
                  
                  // Check if at least one point of feature is within boundary
                  for (const [lng, lat] of featureCoords) {
                    if (isPointInPolygon([lng, lat], boundaryCoords)) {
                      isWithinBoundary = true;
                      req.body.boundaryId = boundary._id.toString();
                      break;
                    }
                  }
                  
                  if (isWithinBoundary) break;
                } else if (boundaryGeom.type === "Polygon" && featureGeometry.type === "Point") {
                  // Point in polygon check
                  const [lng, lat] = featureGeometry.coordinates;
                  if (isPointInPolygon([lng, lat], boundaryGeom.coordinates[0])) {
                    isWithinBoundary = true;
                    req.body.boundaryId = boundary._id.toString();
                    break;
                  }
                }
              } catch (error) {
                console.error('Error checking boundary geometry:', error);
              }
            }
          }
        }
        
        if (!isWithinBoundary) {
          return res.status(403).json({ message: "Features can only be created within assigned boundary areas" });
        }
        
        // Add team ID to feature for proper filtering
        req.body.teamId = user.teamId?.toString();
      } else {
        // Supervisors can create features anywhere without boundary restrictions
        // But still assign their teamId if they have one for proper filtering
        if (user.teamId) {
          req.body.teamId = user.teamId.toString();
        }
      }
      
      const featureData = insertFeatureSchema.parse({
        ...req.body,
        createdBy: user._id.toString(),
        images: imagePaths, // Use the uploaded image paths instead of the form data
      });

      console.log("✅ Parsed feature data:", featureData);
      console.log("📸 Feature data images:", featureData.images);

      const newFeature = await storage.createFeature(featureData);
      
      console.log("🚀 Created feature:", newFeature);
      console.log("📸 Created feature images:", newFeature.images);
      
      res.status(201).json(newFeature);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("❌ Validation error:", error.errors);
        return res.status(400).json({ message: error.errors });
      }
      console.error("❌ Create feature error:", error);
      res.status(500).json({ message: "Failed to create feature" });
    }
  });

  // Get single feature by ID
  app.get("/api/features/:id", isAuthenticated, validateObjectId("id"), async (req, res) => {
    try {
      const featureId = req.params.id;
      const feature = await storage.getFeature(featureId);
      
      if (!feature) {
        return res.status(404).json({ message: "Feature not found" });
      }
      
      console.log("📸 Fetched feature for popup:", feature);
      console.log("📸 Feature images in response:", feature.images);
      
      res.json(feature);
    } catch (error) {
      console.error("Get feature error:", error);
      res.status(500).json({ message: "Failed to fetch feature" });
    }
  });

  app.get("/api/features", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      let features: any[] = [];

      if (user.role === "Supervisor") {
        // Supervisors can see all features
        features = await storage.getAllFeatures();
      } else {
        // Field users: include any feature that is
        // 1) created by their team, OR
        // 2) assigned to their team, OR
        // 3) located within a boundary assigned to their team
        if (user.teamId) {
          const teamIdStr = user.teamId.toString();

          // Fetch everything once to filter in memory (backends normalize differently)
          const [allFeatures, allBoundaries] = await Promise.all([
            storage.getAllFeatures(),
            storage.getAllBoundaries(),
          ]);

          // Collect boundary ids assigned to this team (support populated docs or raw ids)
          const teamBoundaryIds = new Set(
            allBoundaries
              .filter((boundary: any) => {
                const assigned = boundary?.assignedTo;
                if (!assigned) return false;
                const assignedId =
                  typeof assigned === "object"
                    ? assigned._id?.toString?.()
                    : assigned?.toString?.();
                return assignedId === teamIdStr;
              })
              .map((b: any) => b?._id?.toString?.())
              .filter(Boolean)
          );

          features = allFeatures.filter((feature: any) => {
            const createdByTeam = feature?.teamId?.toString?.() === teamIdStr;
            const assignedToTeam = feature?.assignedTo?.toString?.() === teamIdStr;
            const boundaryIdStr =
              typeof feature?.boundaryId === "object"
                ? feature?.boundaryId?._id?.toString?.()
                : feature?.boundaryId?.toString?.();
            const inAssignedBoundary =
              !!boundaryIdStr && teamBoundaryIds.has(boundaryIdStr);
            return createdByTeam || assignedToTeam || inAssignedBoundary;
          });
        }
      }

      res.json(features);
    } catch (error) {
      console.error("Get features error:", error);
      // Be resilient: return an empty list rather than failing the UI
      return res.json([]);
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
          feaStatus: "Assigned" as const
        });

        res.json(updatedFeature);
      } catch (error) {
        console.error("Assign feature to team error:", error);
        res.status(500).json({ message: "Failed to assign feature to team" });
      }
    },
  );

  // (Removed duplicate feature image upload endpoint that used local disk storage)

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

  // Delete feature
  app.delete("/api/features/:id", isAuthenticated, validateObjectId("id"), async (req, res) => {
    try {
      const featureId = req.params.id;
      const user = req.user as any;
      
      // Get the feature first to check permissions
      const feature = await storage.getFeature(featureId);
      if (!feature) {
        return res.status(404).json({ message: "Feature not found" });
      }
      
      // Check if user has permission to delete this feature
      // Supervisors can delete any feature, field users can only delete their own team's features
      console.log("🔍 Delete permissions check:", {
        userRole: user.role,
        userId: user._id.toString(),
        userTeamId: user.teamId?.toString(),
        featureTeamId: feature.teamId?.toString(),
        featureCreatedBy: feature.createdBy?.toString()
      });
      
      if (user.role === "Field") {
        // Field users can delete features if:
        // 1. The feature was created by their team, OR
        // 2. The feature is within a boundary assigned to their team
        let canDelete = false;
        
        // Check if feature was created by their team
        if (feature.teamId?.toString() === user.teamId?.toString()) {
          canDelete = true;
        }
        
        // Check if feature is within a boundary assigned to their team
        if (!canDelete && feature.boundaryId) {
          const boundary = await storage.getBoundary(feature.boundaryId.toString());
          // In the current implementation, assignedTo contains the team ID, not user ID
          if (boundary && boundary.assignedTo?.toString() === user.teamId?.toString()) {
            canDelete = true;
          }
        }
        
        if (!canDelete) {
          return res.status(403).json({ 
            message: "You can only delete features created by your team or within your assigned boundaries",
            debug: {
              userTeamId: user.teamId?.toString(),
              featureTeamId: feature.teamId?.toString(),
              featureBoundaryId: feature.boundaryId?.toString()
            }
          });
        }
      }
      
      const success = await storage.deleteFeature(featureId);
      if (!success) {
        return res.status(404).json({ message: "Feature not found" });
      }
      
      res.json({ message: "Feature deleted successfully" });
    } catch (error) {
      console.error("Delete feature error:", error);
      res.status(500).json({ message: "Failed to delete feature" });
    }
  });

  // Update feature
  app.patch("/api/features/:id", isAuthenticated, validateObjectId("id"), memoryImageUpload.array('images', 10), async (req, res) => {
    try {
      const featureId = req.params.id;
      const user = req.user as any;
      
      // Get the feature first to check permissions
      const existingFeature = await storage.getFeature(featureId);
      if (!existingFeature) {
        return res.status(404).json({ message: "Feature not found" });
      }
      
      // Check if user has permission to update this feature
      // Supervisors can update any feature, field users can only update their own team's features or features within assigned boundaries
      if (user.role === "Field") {
        let canEdit = false;
        
        // Check if feature was created by their team
        if (existingFeature.teamId?.toString() === user.teamId?.toString()) {
          canEdit = true;
        }
        
        // Check if feature is within a boundary assigned to their team
        if (!canEdit && existingFeature.boundaryId) {
          const boundary = await storage.getBoundary(existingFeature.boundaryId.toString());
          // In the current implementation, assignedTo contains the team ID, not user ID
          if (boundary && boundary.assignedTo?.toString() === user.teamId?.toString()) {
            canEdit = true;
          }
        }
        
        if (!canEdit) {
          return res.status(403).json({ 
            message: "You can only update features created by your team or within your assigned boundaries"
          });
        }
      }
      
      // Process uploaded images
      let imagePaths: string[] = [];
      
      // Check if images are being uploaded as files (FormData)
      if (req.files && Array.isArray(req.files)) {
        const uploadedFiles = req.files as Express.Multer.File[];
        const paths: string[] = [];
        for (const file of uploadedFiles) {
          const id = await uploadBufferToGridFS(file.buffer, file.originalname, file.mimetype);
          paths.push(`/api/images/${id}`);
        }
        imagePaths = paths;
        console.log("📸 Processed image paths from GridFS for update:", imagePaths);
      }
      // Check if images are already uploaded and passed as paths in the body
      else if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
        imagePaths = req.body.images.filter((p: string) => typeof p === 'string' && (p.startsWith('/api/images/') || p.startsWith('api/images/') || p.startsWith('/uploads/') || p.startsWith('uploads/')))
          .map((p: string) => p.startsWith('api/images/') ? `/${p}` : (p.startsWith('uploads/') ? `/${p}` : p));
        console.log("📸 Using existing image paths from body for update:", imagePaths);
      }
      
      // Parse the update data
      const updateData = req.body;
      
      // If new images were uploaded, replace the existing images
      if (imagePaths.length > 0) {
        updateData.images = imagePaths;
        console.log("📸 Updating feature with new images:", imagePaths);
      }
      
      // Remove fields that shouldn't be updated directly
      delete updateData._id;
      delete updateData.createdAt;
      delete updateData.updatedAt;
      delete updateData.createdBy;
      delete updateData.geometry; // Prevent geometry updates through this endpoint
      
      const updatedFeature = await storage.updateFeature(featureId, updateData);
      if (!updatedFeature) {
        return res.status(404).json({ message: "Feature not found" });
      }
      
      res.json(updatedFeature);
    } catch (error) {
      console.error("Update feature error:", error);
      res.status(500).json({ message: "Failed to update feature" });
    }
  });

  // Remove a specific image from a feature and delete the backing file
  app.delete("/api/features/:id/images", isAuthenticated, validateObjectId("id"), async (req: Request, res: Response) => {
    try {
      const featureId = req.params.id;
      const { imagePath, imageUrl, imageId } = (req.body || {}) as { imagePath?: string; imageUrl?: string; imageId?: string };
      const targetPath = imagePath || imageUrl || (imageId ? `/api/images/${imageId}` : undefined);

      if (!targetPath || typeof targetPath !== 'string') {
        return res.status(400).json({ message: "imagePath or imageId is required" });
      }

      const feature = await storage.getFeature(featureId);
      if (!feature) {
        return res.status(404).json({ message: "Feature not found" });
      }

      // Permission checks aligned with update rules
      const user = req.user as any;
      if (user.role === "Field") {
        let canEdit = false;
        if (feature.teamId?.toString() === user.teamId?.toString()) {
          canEdit = true;
        }
        if (!canEdit && feature.boundaryId) {
          const boundary = await storage.getBoundary(feature.boundaryId.toString());
          if (boundary && boundary.assignedTo?.toString() === user.teamId?.toString()) {
            canEdit = true;
          }
        }
        if (!canEdit) {
          return res.status(403).json({ message: "You can only update features created by your team or within your assigned boundaries" });
        }
      }

      const currentImages = Array.isArray((feature as any).images) ? ([...(feature as any).images] as string[]) : [];
      const normalizedTarget = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
      const altVariant = normalizedTarget.startsWith('/api/images/') ? normalizedTarget.slice(1) : normalizedTarget.replace(/^\/+/, '');
      const remaining = currentImages.filter((p) => p !== normalizedTarget && p !== altVariant);

      if (remaining.length === currentImages.length) {
        return res.status(404).json({ message: "Image not found on this feature" });
      }

      // Delete backing file if GridFS or legacy uploads
      const gridfsMatch = normalizedTarget.match(/^\/api\/images\/([a-fA-F0-9]{24})$/);
      if (gridfsMatch) {
        const id = gridfsMatch[1];
        try { await deleteGridFSFile(id); } catch (e) { console.warn("GridFS delete failed", id, e); }
      } else if (normalizedTarget.startsWith('/uploads/')) {
        try {
          const p = await import('path');
          const fs = await import('fs');
          const absolute = p.resolve(process.cwd(), normalizedTarget.replace(/^\/+/, ''));
          const uploadsDir = p.join(process.cwd(), 'uploads');
          if (absolute.startsWith(uploadsDir) && fs.existsSync(absolute)) {
            await fs.promises.unlink(absolute);
          }
        } catch (e) {
          console.warn("Local upload delete failed", normalizedTarget, e);
        }
      }

      const updated = await storage.updateFeature(featureId, { images: remaining });
      return res.json(updated);
    } catch (error) {
      console.error("Delete feature image error:", error);
      return res.status(500).json({ message: "Failed to delete feature image" });
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
        boundaries = allBoundaries.filter((boundary: any) => {
          const assigned = boundary?.assignedTo;
          if (!assigned || !user.teamId) return false;
          // Handle both populated doc and raw ObjectId/string
          const assignedId = typeof assigned === 'object' ? assigned._id?.toString?.() : assigned?.toString?.();
          return assignedId === user.teamId.toString();
        });
      }
      
      res.json(boundaries);
    } catch (error) {
      console.error("Get boundaries error:", error);
      res.status(500).json({ message: "Failed to fetch boundaries" });
    }
  });

  // NEW: Get single boundary by ID
  app.get(
    "/api/boundaries/:id",
    isAuthenticated,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const boundaryId = req.params.id;
        const boundary = await storage.getBoundary(boundaryId);
        if (!boundary) {
          return res.status(404).json({ message: "Boundary not found" });
        }
        res.json(boundary);
      } catch (error) {
        console.error("Get boundary error:", error);
        res.status(500).json({ message: "Failed to fetch boundary" });
      }
    },
  );

  // NEW: Update boundary (name, description, status, geometry, assignedTo)
  app.patch(
    "/api/boundaries/:id",
    isSupervisor,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const boundaryId = req.params.id;
        const updates = req.body;
        // Disallow updating _id and timestamps directly
        delete updates._id;
        delete updates.createdAt;
        delete updates.updatedAt;

        // If geometry is present as string, attempt to parse
        if (typeof updates.geometry === 'string') {
          try {
            updates.geometry = JSON.parse(updates.geometry);
          } catch {}
        }

        const updated = await storage.updateBoundary(boundaryId, updates);
        res.json(updated);
      } catch (error) {
        console.error("Update boundary error:", error);
        res.status(500).json({ message: "Failed to update boundary" });
      }
    },
  );

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

  // Unassign boundary from a team (set assignedTo to null)
  app.delete(
    "/api/boundaries/:id/assign",
    isSupervisor,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const boundaryId = req.params.id;
        const boundary = await storage.getBoundary(boundaryId);
        if (!boundary) {
          return res.status(404).json({ message: "Boundary not found" });
        }

        // Use storage directly to update
        const updated = await storage.updateBoundaryStatus(boundaryId, boundary.status);
        // Manually clear assignment using mongoose to avoid adding a new interface method
        const mongoose = await import('mongoose');
        const { Boundary } = await import('@shared/schema');
        await Boundary.updateOne({ _id: new mongoose.Types.ObjectId(boundaryId) }, { $unset: { assignedTo: 1 } });

        const cleared = await storage.getBoundary(boundaryId);
        res.json(cleared);
      } catch (error) {
        console.error("Unassign boundary error:", error);
        res.status(500).json({ message: "Failed to unassign boundary" });
      }
    },
  );

  // Delete boundary route
  app.delete(
    "/api/boundaries/:id",
    isSupervisor,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const boundaryId = req.params.id;
        
        const boundary = await storage.getBoundary(boundaryId);
        if (!boundary) {
          return res.status(404).json({ message: "Boundary not found" });
        }

        const success = await storage.deleteBoundary(boundaryId);
        if (!success) {
          return res.status(404).json({ message: "Boundary not found" });
        }
        
        res.json({ message: "Boundary deleted successfully" });
      } catch (error) {
        console.error("Delete boundary error:", error);
        res.status(500).json({ message: "Failed to delete boundary" });
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

  // Delete team (supervisor only)
  app.delete(
    "/api/teams/:id",
    isSupervisor,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const teamId = req.params.id;
        const team = await storage.getTeam(teamId);
        if (!team) {
          return res.status(404).json({ message: "Team not found" });
        }

        const deleted = await storage.deleteTeam(teamId);
        if (!deleted) {
          return res.status(500).json({ message: "Failed to delete team" });
        }

        res.json({ message: "Team deleted successfully" });
      } catch (error) {
        console.error("Delete team error:", error);
        res.status(500).json({ message: "Failed to delete team" });
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

        const updatedUser: any = await storage.assignUserToTeam(userId, teamId);
        const plainUser = typeof updatedUser?.toObject === "function" ? updatedUser.toObject() : updatedUser;
        const { password, ...userResponse } = plainUser;

        res.json(userResponse);
      } catch (error) {
        console.error("Assign user to team error:", error);
        res.status(500).json({ message: "Failed to assign user to team" });
      }
    },
  );

  app.post(
    "/api/users/:id/unassign-team",
    isSupervisor,
    validateObjectId("id"),
    async (req, res) => {
      try {
        const userId = req.params.id;
        const updatedUser: any = await storage.unassignUserFromTeam(userId);
        const plainUser = typeof updatedUser?.toObject === "function" ? updatedUser.toObject() : updatedUser;
        const { password, ...userResponse } = plainUser;
        res.json(userResponse);
      } catch (error) {
        console.error("Unassign user from team error:", error);
        res.status(500).json({ message: "Failed to unassign user from team" });
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

      // Get all field users and filter by location manually
      const allUsers = await storage.getAllFieldUsers();
      const nearbyUsers = allUsers.filter((user: any) => {
        if (!user.currentLocation || !user.currentLocation.coordinates) return false;
        const [userLng, userLat] = user.currentLocation.coordinates;
        const distance = Math.sqrt(Math.pow(parseFloat(lng as string) - userLng, 2) + Math.pow(parseFloat(lat as string) - userLat, 2));
        return distance <= parseInt(maxDistance as string);
      });

      // Remove passwords from response
      const usersResponse = nearbyUsers.map((user: any) => {
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
        // Get all features and filter by boundary manually
        const allFeatures = await storage.getAllFeatures();
        const features = allFeatures.filter((feature: any) => feature.boundaryId === boundaryId);
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
        // Get tasks by boundary - using getAllTasks and filtering
        const allTasks = await storage.getAllTasks();
        const tasks = allTasks.filter((task: any) => task.boundaryId === boundaryId);
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

      // Get task statistics manually
      const userTasks = await storage.getTasksByAssignee(userId as string);
      const stats = {
        total: userTasks.length,
        completed: userTasks.filter((task: any) => task.status === 'Completed').length,
        inProgress: userTasks.filter((task: any) => task.status === 'InProgress').length,
        pending: userTasks.filter((task: any) => task.status === 'New').length
      };
      res.json(stats);
    } catch (error) {
      console.error("Get task stats error:", error);
      res.status(500).json({ message: "Failed to get task statistics" });
    }
  });

  app.get("/api/analytics/feature-stats", isAuthenticated, async (req, res) => {
    try {
      // Get feature statistics manually
      const allFeatures = await storage.getAllFeatures();
      const stats = {
        total: allFeatures.length,
        assigned: allFeatures.filter((feature: any) => feature.feaStatus === 'Assigned').length,
        unassigned: allFeatures.filter((feature: any) => feature.feaStatus === 'UnAssigned').length,
        completed: allFeatures.filter((feature: any) => feature.feaStatus === 'Completed').length,
        delayed: allFeatures.filter((feature: any) => feature.feaStatus === 'Delayed').length
      };
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

      // Search features manually
      const allFeatures = await storage.getAllFeatures();
      const features = allFeatures.filter((feature: any) => 
        feature.name.toLowerCase().includes((q as string).toLowerCase()) ||
        feature.feaNo.toLowerCase().includes((q as string).toLowerCase()) ||
        feature.feaType.toLowerCase().includes((q as string).toLowerCase())
      );
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

      // Search tasks manually
      const allTasks = await storage.getAllTasks();
      const tasks = allTasks.filter((task: any) => 
        task.title.toLowerCase().includes((q as string).toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes((q as string).toLowerCase()))
      );
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
    upload.array("files", 10),
    validateObjectId("taskId"),
    async (req, res) => {
      try {
        const taskId = req.params.taskId;
        const user = req.user as any;
        const { description } = req.body;

        if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
          return res.status(400).json({ message: "At least one file is required" });
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

        const files = (req.files as Express.Multer.File[]).map(file => ({
          fileName: file.originalname,
          fileUrl: `/uploads/${file.filename}`,
          fileType: file.mimetype,
          fileSize: file.size,
        }));

        const submissionData = {
          taskId: taskId,
          userId: user._id.toString(),
          teamId: user.teamId?.toString() || undefined,
          files: files,
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

  // Feature Templates Routes
  app.post("/api/feature-templates", isAuthenticated, isSupervisor, async (req, res) => {
    try {
      const validatedData = insertFeatureTemplateSchema.parse(req.body);
      const user = req.user as any;
      
      const templateData = {
        ...validatedData,
        createdBy: user._id
      };
      
      const template = new FeatureTemplate(templateData);
      await template.save();
      
      res.json(template);
    } catch (error) {
      console.error("Create feature template error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      res.status(500).json({ message: "Failed to create feature template" });
    }
  });

  app.get("/api/feature-templates", isAuthenticated, isSupervisor, async (req, res) => {
    try {
      const templates = await FeatureTemplate.find()
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 });
      res.json(templates);
    } catch (error) {
      console.error("Get feature templates error:", error);
      res.status(500).json({ message: "Failed to fetch feature templates" });
    }
  });

  app.delete("/api/feature-templates/:id", isAuthenticated, isSupervisor, async (req, res) => {
    try {
      const templateId = req.params.id;
      
      if (!isValidObjectId(templateId)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      
      const template = await FeatureTemplate.findByIdAndDelete(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Delete feature template error:", error);
      res.status(500).json({ message: "Failed to delete feature template" });
    }
  });

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

      // Bulk update tasks manually
      const updatePromises = taskIds.map((taskId: string) => 
        storage.updateTaskStatus(taskId, status, req.user.id)
      );
      const results = await Promise.all(updatePromises);
      const updatedCount = results.length;
      res.json({ message: `Updated ${updatedCount} tasks`, updatedCount });
    } catch (error) {
      console.error("Bulk update task status error:", error);
      res.status(500).json({ message: "Failed to bulk update task status" });
    }
  });

  // Shapefile upload routes
  app.post(
    "/api/shapefiles/upload",
    isAuthenticated,
    uploadImages.single('shapefile'),
    async (req: any, res: Response) => {
      try {
        const { name, shapefileType, description, assignedTo, uploadedBy } = req.body;
        const userId = req.user._id || req.user.id;

        if (!req.file) {
          return res.status(400).json({ message: "Shapefile is required" });
        }

        if (!name || !shapefileType) {
          return res.status(400).json({ message: "Name and type are required" });
        }

        console.log(`📦 Processing shapefile upload: ${req.file.originalname}`);
        
        let features: any[] = [];
        
        try {
          // Import shpjs for shapefile to GeoJSON conversion
          const shp = (await import('shpjs')).default;
          const fs = await import('fs');

          // Read the uploaded file as buffer
          const buffer = fs.readFileSync(req.file.path);
          
          console.log(`🔍 Converting shapefile to GeoJSON using shpjs`);
          
          // Convert shapefile to GeoJSON using shpjs
          const geojson = await shp(buffer);
          
          console.log(`📊 Conversion result type:`, typeof geojson);
          console.log(`📊 GeoJSON structure:`, Object.keys(geojson));
          
          // Handle different return types from shpjs
          let featureCollection;
          
          if (Array.isArray(geojson)) {
            // If it's an array of FeatureCollections, take the first one
            featureCollection = geojson[0];
          } else if (geojson.type === 'FeatureCollection') {
            // If it's already a FeatureCollection
            featureCollection = geojson;
          } else if (geojson.features) {
            // If it has features property
            featureCollection = geojson;
          } else {
            throw new Error('Unexpected GeoJSON structure from shpjs');
          }
          
          if (featureCollection && featureCollection.features) {
            features = featureCollection.features.map((feature: any) => ({
              type: "Feature",
              geometry: feature.geometry,
              properties: feature.properties || {}
            }));
          }
          
          console.log(`✅ Extracted ${features.length} features from shapefile using shpjs`);
          
        } catch (parseError) {
          console.error('❌ Shapefile parsing error:', parseError);
          // Continue with empty features array if parsing fails
          features = [];
        }

        const shapefileData = {
          name,
          originalFilename: req.file.originalname,
          shapefileType,
          description: description || '',
          features,
          uploadedBy: uploadedBy || userId,
          assignedTo: assignedTo || undefined,
          teamId: assignedTo || undefined,
          filePath: req.file.path,
          isVisible: true,
        };

        const newShapefile = await storage.createShapefile(shapefileData);
        
        console.log(`🎯 Shapefile "${name}" saved with ${features.length} features`);
        
        res.status(201).json(newShapefile);
      } catch (error) {
        console.error("Shapefile upload error:", error);
        res.status(500).json({ message: "Failed to upload shapefile" });
      }
    },
  );

  // Image retrieval endpoint from GridFS
  app.get("/api/images/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params as any;
      if (!id || !isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid image id" });
      }

      const info = await getGridFSFileInfo(id);
      if (!info) {
        return res.status(404).json({ message: "Image not found" });
      }

      const contentType = info.contentType || info.metadata?.contentType || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", String(info.length));
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Content-Disposition", `inline; filename="${info.filename || "image"}"`);

      const stream = openGridFSDownloadStream(id);
      stream.on("error", (err) => {
        console.error("GridFS stream error:", err);
        if (!res.headersSent) res.status(500).end();
      });
      stream.pipe(res);
    } catch (error) {
      console.error("Failed to retrieve image:", error);
      res.status(500).json({ message: "Failed to retrieve image" });
    }
  });

  // Delete a single image from GridFS and remove reference from any feature using it
  app.delete("/api/images/:id", isAuthenticated, validateObjectId("id"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params as any;
      await deleteGridFSFile(id);

      const { Feature } = await import('@shared/schema');
      const variants = [
        `/api/images/${id}`,
        `api/images/${id}`,
      ];
      await Feature.updateMany(
        { images: { $in: variants } },
        { $pull: { images: { $in: variants } } }
      );

      return res.json({ message: "Image deleted successfully" });
    } catch (error) {
      console.error("Failed to delete image:", error);
      return res.status(500).json({ message: "Failed to delete image" });
    }
  });

  // Get all shapefiles (supervisors) or assigned shapefiles (field teams)
  app.get("/api/shapefiles", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      let shapefiles;

      if (user.role === 'Supervisor') {
        // Supervisors see all shapefiles
        shapefiles = await storage.getAllShapefiles();
      } else {
        // Field teams see only assigned shapefiles or their own uploads
        const userShapefiles = await storage.getShapefilesByUser(user.id);
        const teamShapefiles = user.teamName ? 
          await storage.getShapefilesByTeam(user.teamName) : [];
        
        // Combine and deduplicate
        const allShapefiles = [...userShapefiles, ...teamShapefiles];
        shapefiles = allShapefiles.filter((shapefile, index, self) =>
          index === self.findIndex(s => s._id.toString() === shapefile._id.toString())
        );
      }

      res.json(shapefiles);
    } catch (error) {
      console.error("Get shapefiles error:", error);
      res.status(500).json({ message: "Failed to fetch shapefiles" });
    }
  });

  // Get specific shapefile
  app.get("/api/shapefiles/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const shapefileId = req.params.id;
      const shapefile = await storage.getShapefile(shapefileId);

      if (!shapefile) {
        return res.status(404).json({ message: "Shapefile not found" });
      }

      res.json(shapefile);
    } catch (error) {
      console.error("Get shapefile error:", error);
      res.status(500).json({ message: "Failed to fetch shapefile" });
    }
  });

  // Update shapefile visibility
  app.put(
    "/api/shapefiles/:id/visibility",
    isAuthenticated,
    validateObjectId('id'),
    async (req: Request, res: Response) => {
      try {
        const shapefileId = req.params.id;
        const { isVisible } = req.body;

        if (typeof isVisible !== 'boolean') {
          return res.status(400).json({ message: "isVisible must be a boolean" });
        }

        const updatedShapefile: any = await storage.updateShapefileVisibility(
          shapefileId,
          isVisible,
        );

        // Return a minimal payload to avoid transferring very large feature arrays
        const features = updatedShapefile?.features;
        const featuresCount = Array.isArray(features)
          ? features.length
          : (features && typeof features === 'object' && Array.isArray(features.features)
              ? features.features.length
              : undefined);

        return res.json({
          _id: updatedShapefile._id,
          name: updatedShapefile.name,
          originalFilename: updatedShapefile.originalFilename,
          shapefileType: updatedShapefile.shapefileType,
          isVisible: updatedShapefile.isVisible,
          featuresCount,
          updatedAt: updatedShapefile.updatedAt,
          createdAt: updatedShapefile.createdAt,
        });
      } catch (error: any) {
        console.error("Update shapefile visibility error:", error);
        // Always respond with 500 here; proxies translating payload issues as 502 is misleading
        return res.status(500).json({ message: 'Failed to update shapefile visibility' });
      }
    },
  );

  // Delete shapefile (supervisors only)
  app.delete(
    "/api/shapefiles/:id",
    isSupervisor,
    async (req: Request, res: Response) => {
      try {
        const shapefileId = req.params.id;
        const deleted = await storage.deleteShapefile(shapefileId);

        if (!deleted) {
          return res.status(404).json({ message: "Shapefile not found" });
        }

        res.json({ message: "Shapefile deleted successfully" });
      } catch (error) {
        console.error("Delete shapefile error:", error);
        res.status(500).json({ message: "Failed to delete shapefile" });
      }
    },
  );

  return httpServer;
}

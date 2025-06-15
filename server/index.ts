import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setStorage, type IStorage } from "./storage";
import { MongoStorage } from "./mongoStorage";
import { connectToMongoDB } from "./mongoDb";
import { InsertUser, InsertTeam, InsertFeature } from "@shared/schema";
import bcrypt from "bcryptjs";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Function to add supervisor account and team data
async function addInitialData(storage: IStorage) {
  try {
    log("Setting up initial data...");

    // Check if supervisor exists
    const existingSupervisor = await storage.getUserByUsername("supervisor12");
    let supervisorId: string;

    if (!existingSupervisor) {
      // Create supervisor account
      log("Creating supervisor account with username: supervisor12");
      const supervisorData: InsertUser = {
        username: "supervisor12",
        password: "supervisor@12", // Will be hashed in storage.createUser
        name: "System Supervisor",
        email: "supervisor@geowhats.com",
        role: "Supervisor",
      };

      const supervisor = await storage.createUser(supervisorData);
      supervisorId = supervisor._id.toString();
      log(`Supervisor created with ID: ${supervisorId}`);
    } else {
      supervisorId = existingSupervisor._id.toString();
      log(`Supervisor already exists with ID: ${supervisorId}`);
    }

    // Check if teams exist
    const allTeams = await storage.getAllTeams();

    if (allTeams.length === 0) {
      // Create initial teams
      log("Creating initial teams for field users");

      const teams: InsertTeam[] = [
        {
          name: "Alpha",
          description:
            "Primary field operations team for towers and infrastructure",
          status: "Approved",
          createdBy: supervisorId,
        },
        {
          name: "Beta",
          description: "Secondary field operations team for maintenance tasks",
          status: "Approved",
          createdBy: supervisorId,
        },
        {
          name: "Charlie",
          description:
            "Specialized team for infrastructure maintenance and repairs",
          status: "Approved",
          createdBy: supervisorId,
        },
        {
          name: "Delta",
          description: "Team responsible for site surveys and boundary mapping",
          status: "Approved",
          createdBy: supervisorId,
        },
      ];

      for (const teamData of teams) {
        const team = await storage.createTeam(teamData);
        log(`Created team: ${team.name} (ID: ${team._id})`);
      }

      log("Initial teams created successfully");
    } else {
      log(`Found ${allTeams.length} existing teams`);
    }

    // Create sample infrastructure features
    const allFeatures = await storage.getAllFeatures();
    if (allFeatures.length === 0) {
      log("Creating sample infrastructure features");

      const sampleFeatures: InsertFeature[] = [
        // Towers
        {
          name: "Communication Tower Alpha",
          feaType: "Tower",
          specificType: "Mobillink",
          feaNo: "TWR-001",
          feaState: "As-Built",
          feaStatus: "Completed",
          maintenance: "None",
          geometry: {
            type: "Point",
            coordinates: [67.0011, 24.8607] // [lng, lat]
          },
          createdBy: supervisorId,
        },
        {
          name: "Radio Tower Beta",
          feaType: "Tower",
          specificType: "Ptcl",
          feaNo: "TWR-002",
          feaState: "As-Built",
          feaStatus: "Active",
          maintenance: "Required",
          geometry: {
            type: "Point",
            coordinates: [67.0051, 24.8647] // [lng, lat]
          },
          createdBy: supervisorId,
        },
        {
          name: "Microwave Tower",
          feaType: "Tower",
          specificType: "Mobillink",
          feaNo: "TWR-003",
          feaState: "Plan",
          feaStatus: "New",
          maintenance: "None",
          geometry: {
            type: "Point",
            coordinates: [66.9971, 24.8567] // [lng, lat]
          },
          createdBy: supervisorId,
        },
        // Manholes
        {
          name: "Main Street Manhole",
          feaType: "Manhole",
          specificType: "2-way",
          feaNo: "MH-001",
          feaState: "As-Built",
          feaStatus: "Completed",
          maintenance: "None",
          geometry: {
            type: "Point",
            coordinates: [67.0031, 24.8627] // [lng, lat]
          },
          createdBy: supervisorId,
        },
        {
          name: "Junction Manhole A",
          feaType: "Manhole",
          specificType: "4-way",
          feaNo: "MH-002",
          feaState: "Under Construction",
          feaStatus: "In-Completed",
          maintenance: "None",
          geometry: {
            type: "Point",
            coordinates: [67.0071, 24.8587] // [lng, lat]
          },
          createdBy: supervisorId,
        },
        {
          name: "Distribution Manhole",
          feaType: "Manhole",
          specificType: "2-way",
          feaNo: "MH-003",
          feaState: "As-Built",
          feaStatus: "Active",
          maintenance: "Required",
          geometry: {
            type: "Point",
            coordinates: [66.9991, 24.8547] // [lng, lat]
          },
          createdBy: supervisorId,
        },
        // Fiber Cables
        {
          name: "Primary Fiber Route",
          feaType: "FiberCable",
          specificType: "24F",
          feaNo: "FC-001",
          feaState: "As-Built",
          feaStatus: "Completed",
          maintenance: "None",
          geometry: {
            type: "LineString",
            coordinates: [
              [67.0011, 24.8607],
              [67.0031, 24.8627],
              [67.0051, 24.8647]
            ]
          },
          createdBy: supervisorId,
        },
        {
          name: "Distribution Cable A",
          feaType: "FiberCable",
          specificType: "10F",
          feaNo: "FC-002",
          feaState: "As-Built",
          feaStatus: "Active",
          maintenance: "Required",
          geometry: {
            type: "LineString",
            coordinates: [
              [67.0031, 24.8627],
              [67.0071, 24.8587],
              [66.9991, 24.8547]
            ]
          },
          createdBy: supervisorId,
        },
        {
          name: "Backup Fiber Link",
          feaType: "FiberCable",
          specificType: "10F",
          feaNo: "FC-003",
          feaState: "Plan",
          feaStatus: "New",
          maintenance: "None",
          geometry: {
            type: "LineString",
            coordinates: [
              [66.9971, 24.8567],
              [67.0011, 24.8607]
            ]
          },
          createdBy: supervisorId,
        },
        // Parcels
        {
          name: "Commercial Parcel Zone A",
          feaType: "Parcel",
          specificType: "Commercial",
          feaNo: "PCL-001",
          feaState: "As-Built",
          feaStatus: "Completed",
          maintenance: "None",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [67.0090, 24.8660],
              [67.0110, 24.8660],
              [67.0110, 24.8680],
              [67.0090, 24.8680],
              [67.0090, 24.8660]
            ]]
          },
          createdBy: supervisorId,
        },
        {
          name: "Residential Parcel B",
          feaType: "Parcel",
          specificType: "Residential",
          feaNo: "PCL-002",
          feaState: "Under Construction",
          feaStatus: "In-Completed",
          maintenance: "None",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [66.9950, 24.8520],
              [66.9970, 24.8520],
              [66.9970, 24.8540],
              [66.9950, 24.8540],
              [66.9950, 24.8520]
            ]]
          },
          createdBy: supervisorId,
        },
        {
          name: "Industrial Parcel C",
          feaType: "Parcel",
          specificType: "Commercial",
          feaNo: "PCL-003",
          feaState: "As-Built",
          feaStatus: "Active",
          maintenance: "None",
          geometry: {
            type: "Polygon",
            coordinates: [[
              [67.0130, 24.8700],
              [67.0160, 24.8700],
              [67.0160, 24.8720],
              [67.0130, 24.8720],
              [67.0130, 24.8700]
            ]]
          },
          createdBy: supervisorId,
        }
      ];

      for (const featureData of sampleFeatures) {
        const feature = await storage.createFeature(featureData);
        log(`Created feature: ${feature.name} (${feature.feaType} ${feature.feaNo})`);
      }

      log("Sample infrastructure features created successfully");
    } else {
      log(`Found ${allFeatures.length} existing features`);
    }

    // Create sample tasks assigned to features and teams
    const existingTasks = await storage.getAllTasks();
    if (existingTasks.length === 0) {
      const allFeatures = await storage.getAllFeatures();
      const allTeamsData = await storage.getAllTeams();
      
      // Get team references
      const fieldTeamAlpha = allTeamsData.find(t => t.name === "Field Team Alpha");
      const fieldTeamBeta = allTeamsData.find(t => t.name === "Field Team Beta");
      const maintenanceTeam = allTeamsData.find(t => t.name === "Maintenance Team");
      const surveyTeam = allTeamsData.find(t => t.name === "Survey Team");
      
      const sampleTasks = [
        // Tower maintenance tasks
        {
          title: "Tower Inspection - Site Alpha",
          description: "Quarterly inspection of communication tower including structural integrity, equipment status, and safety compliance check.",
          taskType: "Inspection",
          priority: "High",
          status: "Assigned",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          assignedTo: fieldTeamAlpha!._id.toString(),
          createdBy: supervisorId,
          location: {
            lat: 24.8607,
            lng: 67.0011
          },
          relatedFeatureId: allFeatures.find(f => f.feaNo === "TWR-001")?._id.toString()
        },
        {
          title: "Equipment Upgrade - Tower Beta",
          description: "Install new 5G equipment and upgrade power systems. Requires coordination with electrical team.",
          taskType: "Maintenance",
          priority: "Medium",
          status: "In Progress",
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          assignedTo: fieldTeamBeta!._id.toString(),
          createdBy: supervisorId,
          location: {
            lat: 24.8647,
            lng: 67.0051
          },
          relatedFeatureId: allFeatures.find(f => f.feaNo === "TWR-002")?._id.toString()
        },
        // Manhole maintenance tasks
        {
          title: "Manhole Cover Replacement",
          description: "Replace damaged manhole cover and inspect underground infrastructure. Safety protocols required.",
          taskType: "Repair",
          priority: "High",
          status: "Unassigned",
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          assignedTo: maintenanceTeam!._id.toString(),
          createdBy: supervisorId,
          location: {
            lat: 24.8567,
            lng: 66.9971
          },
          relatedFeatureId: allFeatures.find(f => f.feaNo === "MH-001")?._id.toString()
        },
        {
          title: "Underground Cable Inspection",
          description: "Monthly inspection of underground cables and junction points. Document any wear or damage.",
          taskType: "Inspection",
          priority: "Medium",
          status: "Completed",
          dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          assignedTo: maintenanceTeam!._id.toString(),
          createdBy: supervisorId,
          location: {
            lat: 24.8587,
            lng: 67.0031
          },
          relatedFeatureId: allFeatures.find(f => f.feaNo === "MH-002")?._id.toString()
        },
        // Fiber cable tasks
        {
          title: "Fiber Optic Testing",
          description: "Comprehensive testing of fiber optic connections including signal strength and data integrity checks.",
          taskType: "Testing",
          priority: "Medium",
          status: "In Progress",
          dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
          assignedTo: fieldTeamAlpha!._id.toString(),
          createdBy: supervisorId,
          location: {
            lat: 24.8627,
            lng: 67.0031
          },
          relatedFeatureId: allFeatures.find(f => f.feaNo === "FC-002")?._id.toString()
        },
        {
          title: "New Fiber Installation Planning",
          description: "Survey and plan new fiber cable installation route. Coordinate with municipal authorities.",
          taskType: "Survey",
          priority: "Low",
          status: "Unassigned",
          dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
          assignedTo: surveyTeam!._id.toString(),
          createdBy: supervisorId,
          location: {
            lat: 24.8567,
            lng: 66.9971
          },
          relatedFeatureId: allFeatures.find(f => f.feaNo === "FC-003")?._id.toString()
        },
        // Parcel development tasks
        {
          title: "Commercial Property Assessment",
          description: "Conduct comprehensive assessment of commercial parcel for development potential and infrastructure requirements.",
          taskType: "Assessment",
          priority: "Medium",
          status: "In Progress",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          assignedTo: surveyTeam!._id.toString(),
          createdBy: supervisorId,
          location: {
            lat: 24.8670,
            lng: 67.0100
          },
          relatedFeatureId: allFeatures.find(f => f.feaNo === "PCL-001")?._id.toString()
        },
        {
          title: "Residential Zone Utility Setup",
          description: "Install utility connections for new residential development. Coordinate with power and water utilities.",
          taskType: "Installation",
          priority: "High",
          status: "Assigned",
          dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
          assignedTo: maintenanceTeam!._id.toString(),
          createdBy: supervisorId,
          location: {
            lat: 24.8530,
            lng: 66.9960
          },
          relatedFeatureId: allFeatures.find(f => f.feaNo === "PCL-002")?._id.toString()
        },
        // General area tasks
        {
          title: "Quarterly Safety Audit",
          description: "Comprehensive safety audit of all field operations including equipment, procedures, and team compliance.",
          taskType: "Audit",
          priority: "High",
          status: "Unassigned",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          assignedTo: fieldTeamAlpha!._id.toString(),
          createdBy: supervisorId,
          location: {
            lat: 24.8600,
            lng: 67.0000
          }
        },
        {
          title: "Equipment Inventory Check",
          description: "Monthly inventory check of all field equipment, tools, and safety gear. Update maintenance schedules.",
          taskType: "Inventory",
          priority: "Low",
          status: "Completed",
          dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          assignedTo: maintenanceTeam!._id.toString(),
          createdBy: supervisorId,
          location: {
            lat: 24.8580,
            lng: 67.0020
          }
        }
      ];

      for (const taskData of sampleTasks) {
        const task = await storage.createTask(taskData as any);
        const relatedFeature = taskData.relatedFeatureId 
          ? allFeatures.find(f => f._id.toString() === taskData.relatedFeatureId)
          : null;
        const assignedTeam = allTeamsData.find(t => t._id.toString() === taskData.assignedTo);
        
        log(`Created task: ${task.title} - Assigned to: ${assignedTeam?.name}${relatedFeature ? ` (Feature: ${relatedFeature.feaNo})` : ''}`);
      }

      log("Sample tasks with team assignments created successfully");
    } else {
      log(`Found ${existingTasks.length} existing tasks`);
    }

    // Create a sample field user for testing (optional)
    const existingFieldUser =
      await storage.getUserByUsername("field_user_demo");
    if (!existingFieldUser && allTeams.length > 0) {
      log("Creating demo field user");

      const fieldUserData: InsertUser = {
        username: "field_user_demo",
        password: "demo123",
        name: "Demo Field User",
        email: "field.demo@geowhats.com",
        role: "Field",
        teamId: allTeams[0]._id.toString(), // Assign to first team
      };

      const fieldUser = await storage.createUser(fieldUserData);
      log(`Demo field user created with ID: ${fieldUser._id}`);
    }

    log("Initial data setup completed successfully");
  } catch (error) {
    console.error("Error adding initial data:", error);
    throw error; // Re-throw to handle connection issues
  }
}

// Function to initialize storage with connection handling
async function initializeStorage(): Promise<IStorage> {
  const useMongoDb = process.env.USE_MONGODB !== "false"; // Default to true unless explicitly disabled

  if (useMongoDb) {
    try {
      log("Attempting to connect to MongoDB...");

      // Try MongoDB first
      const { setupDatabase } = await import("./db");
      const { MongoStorage } = await import("./mongoStorage");

      // Setup database connection and indexes
      await setupDatabase();

      const storage = new MongoStorage();
      log("MongoDB connection established successfully");
      return storage;
    } catch (error) {
      console.error("MongoDB connection failed:", error);
      log("Falling back to file storage...");
    }
  } else {
    log("MongoDB disabled via environment variable, using file storage");
  }

  // Fallback to file storage
  log("Using file storage for data persistence...");
  const { FileStorage } = await import("./fileStorage");
  return new FileStorage();
}

// Graceful shutdown handling
function setupGracefulShutdown(server: any, storage: IStorage) {
  const shutdown = async (signal: string) => {
    log(`Received ${signal}. Shutting down gracefully...`);

    try {
      // Close HTTP server
      server.close(() => {
        log("HTTP server closed");
      });

      // Close database connection if it's MongoDB
      if ("disconnect" in storage) {
        await (storage as any).disconnect();
        log("Database connection closed");
      }

      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

(async () => {
  try {
    log("Starting GeoFieldX application...");

    // Initialize storage (MongoDB with file storage fallback)
    const storage = await initializeStorage();

    // Set as the global storage instance
    setStorage(storage);

    // Add initial data (supervisor account and teams)
    await addInitialData(storage);

    // Setup routes
    const server = await registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      log(`Error ${status}: ${message}`);
      res.status(status).json({ message });

      // Log error details in development
      if (app.get("env") === "development") {
        console.error(err);
      }
    });

    // Setup Vite in development or serve static files in production
    if (app.get("env") === "development") {
      log("Setting up Vite development server...");
      await setupVite(app, server);
    } else {
      log("Serving static files for production...");
      serveStatic(app);
    }

    // Start the server
    const port = parseInt(process.env.PORT || "5000", 10);
    const host = process.env.HOST || "0.0.0.0";

    server.listen(
      {
        port,
        host,
        reusePort: true,
      },
      () => {
        log(`🚀 GeoFieldX server running on http://${host}:${port}`);
        log(`📊 Environment: ${app.get("env") || "development"}`);
        log(`💾 Storage: ${storage.constructor.name}`);

        if (app.get("env") === "development") {
          log("📝 API documentation available at /api");
          log("🔧 Development tools enabled");
        }
      },
    );

    // Setup graceful shutdown
    setupGracefulShutdown(server, storage);
  } catch (error) {
    console.error("Failed to start application:", error);

    // If MongoDB fails completely, try file storage as last resort
    if (error instanceof Error && error.message.includes("MongoDB")) {
      try {
        log("Attempting emergency file storage fallback...");
        const { FileStorage } = await import("./fileStorage");
        const storage = new FileStorage();
        setStorage(storage);
        await addInitialData(storage);
        log(
          "Emergency fallback successful - application running with file storage",
        );
      } catch (fallbackError) {
        console.error("Emergency fallback also failed:", fallbackError);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
})();

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

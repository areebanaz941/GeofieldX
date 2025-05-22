import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setStorage, type IStorage } from "./storage";
import { MongoStorage } from "./mongoStorage";
import { connectToMongoDB } from "./mongoDb";
import { InsertUser, InsertTeam } from "@shared/schema";

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
    // Check if supervisor exists
    const existingSupervisor = await storage.getUserByUsername('supervisor12');
    
    if (!existingSupervisor) {
      // Create supervisor account
      console.log('Creating supervisor account with username: supervisor12');
      const supervisorData: InsertUser = {
        username: 'supervisor12',
        password: 'supervisor@12',
        name: 'Supervisor',
        email: 'supervisor@geowhats.com',
        role: 'Supervisor',
        teamId: null
      };
      
      await storage.createUser(supervisorData);
    }
    
    // Check if teams exist
    const allTeams = await storage.getAllTeams();
    
    if (allTeams.length === 0) {
      // Create initial teams
      console.log('Creating initial teams for field users');
      
      const teams: InsertTeam[] = [
        {
          name: 'Field Team Alpha',
          description: 'Primary field operations team',
          status: 'Approved'
        },
        {
          name: 'Field Team Beta',
          description: 'Secondary field operations team',
          status: 'Approved'
        },
        {
          name: 'Maintenance Team',
          description: 'Team responsible for infrastructure maintenance',
          status: 'Approved'
        }
      ];
      
      for (const team of teams) {
        await storage.createTeam(team);
      }
    }
  } catch (error) {
    console.error('Error adding initial data:', error);
  }
}

(async () => {
  let storage = null;
  
  // Attempt to connect to MongoDB
  try {
    console.log('Attempting to connect to MongoDB...');
    const isConnected = await connectToMongoDB();
    
    if (isConnected) {
      console.log('Using MongoDB storage for data persistence');
      // Use MongoDB for storage
      storage = new MongoStorage();
    } else {
      console.log('MongoDB connection failed, falling back to file storage');
      // Import FileStorage here to handle the fallback case
      const { FileStorage } = await import('./fileStorage');
      storage = new FileStorage();
    }
    
    // Initialize this storage as our data backend
    setStorage(storage);
    
    // Add the supervisor account and initial team data
    await addInitialData(storage);
    
  } catch (error) {
    console.error('Error during storage initialization:', error);
    throw error;
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();

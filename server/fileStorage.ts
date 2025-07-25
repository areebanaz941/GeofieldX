import fs from "fs";
import path from "path";
import { IStorage } from "./storage";
import {
  IUser,
  ITeam,
  ITask,
  IFeature,
  IBoundary,
  ITaskUpdate,
  ITaskEvidence,
  InsertUser,
  InsertTeam,
  InsertTask,
  InsertFeature,
  InsertBoundary,
  InsertTaskUpdate,
  InsertTaskEvidence,
  isValidObjectId,
} from "@shared/schema";

/**
 * FileStorage implementation of IStorage interface
 * This class stores data in local JSON files to persist between app restarts
 * Updated to use MongoDB-style ObjectIds for consistency
 */
export class FileStorage implements IStorage {
  private users: Map<string, IUser> = new Map();
  private tasks: Map<string, ITask> = new Map();
  private features: Map<string, IFeature> = new Map();
  private boundaries: Map<string, IBoundary> = new Map();
  private taskUpdates: Map<string, ITaskUpdate> = new Map();
  private taskEvidence: Map<string, ITaskEvidence> = new Map();
  private teams: Map<string, ITeam> = new Map();

  private dataDir: string;

  constructor() {
    this.dataDir = path.join(process.cwd(), "data");

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.loadAllData();
  }

  // Generate MongoDB-style ObjectId
  private generateObjectId(): string {
    const timestamp = Math.floor(Date.now() / 1000)
      .toString(16)
      .padStart(8, "0");
    const machineId = Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0");
    const processId = Math.floor(Math.random() * 65535)
      .toString(16)
      .padStart(4, "0");
    const counter = Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0");
    return timestamp + machineId + processId + counter;
  }

  // Load data from files
  private loadAllData() {
    this.loadUsers();
    this.loadTeams();
    this.loadTasks();
    this.loadFeatures();
    this.loadBoundaries();
    this.loadTaskUpdates();
    this.loadTaskEvidence();
  }

  // Helper methods for file operations
  private loadUsers() {
    try {
      const filePath = path.join(this.dataDir, "users.json");
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        this.users = new Map(
          data.users.map((user: IUser) => [user._id.toString(), user]),
        );
      }
    } catch (error) {
      console.error("Error loading users data:", error);
    }
  }

  private saveUsers() {
    try {
      const filePath = path.join(this.dataDir, "users.json");
      const data = {
        users: Array.from(this.users.values()),
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error saving users data:", error);
    }
  }

  private loadTeams() {
    try {
      const filePath = path.join(this.dataDir, "teams.json");
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        this.teams = new Map(
          data.teams.map((team: ITeam) => [team._id.toString(), team]),
        );
      }
    } catch (error) {
      console.error("Error loading teams data:", error);
    }
  }

  private saveTeams() {
    try {
      const filePath = path.join(this.dataDir, "teams.json");
      const data = {
        teams: Array.from(this.teams.values()),
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error saving teams data:", error);
    }
  }

  private loadTasks() {
    try {
      const filePath = path.join(this.dataDir, "tasks.json");
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        this.tasks = new Map(
          data.tasks.map((task: ITask) => [task._id.toString(), task]),
        );
      }
    } catch (error) {
      console.error("Error loading tasks data:", error);
    }
  }

  private saveTasks() {
    try {
      const filePath = path.join(this.dataDir, "tasks.json");
      const data = {
        tasks: Array.from(this.tasks.values()),
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error saving tasks data:", error);
    }
  }

  private loadFeatures() {
    try {
      const filePath = path.join(this.dataDir, "features.json");
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        this.features = new Map(
          data.features.map((feature: IFeature) => [
            feature._id.toString(),
            feature,
          ]),
        );
      }
    } catch (error) {
      console.error("Error loading features data:", error);
    }
  }

  private saveFeatures() {
    try {
      const filePath = path.join(this.dataDir, "features.json");
      const data = {
        features: Array.from(this.features.values()),
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error saving features data:", error);
    }
  }

  private loadBoundaries() {
    try {
      const filePath = path.join(this.dataDir, "boundaries.json");
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        this.boundaries = new Map(
          data.boundaries.map((boundary: IBoundary) => [
            boundary._id.toString(),
            boundary,
          ]),
        );
      }
    } catch (error) {
      console.error("Error loading boundaries data:", error);
    }
  }

  private saveBoundaries() {
    try {
      const filePath = path.join(this.dataDir, "boundaries.json");
      const data = {
        boundaries: Array.from(this.boundaries.values()),
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error saving boundaries data:", error);
    }
  }

  private loadTaskUpdates() {
    try {
      const filePath = path.join(this.dataDir, "taskUpdates.json");
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        this.taskUpdates = new Map(
          data.taskUpdates.map((update: ITaskUpdate) => [
            update._id.toString(),
            update,
          ]),
        );
      }
    } catch (error) {
      console.error("Error loading task updates data:", error);
    }
  }

  private saveTaskUpdates() {
    try {
      const filePath = path.join(this.dataDir, "taskUpdates.json");
      const data = {
        taskUpdates: Array.from(this.taskUpdates.values()),
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error saving task updates data:", error);
    }
  }

  private loadTaskEvidence() {
    try {
      const filePath = path.join(this.dataDir, "taskEvidence.json");
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        this.taskEvidence = new Map(
          data.taskEvidence.map((evidence: ITaskEvidence) => [
            evidence._id.toString(),
            evidence,
          ]),
        );
      }
    } catch (error) {
      console.error("Error loading task evidence data:", error);
    }
  }

  private saveTaskEvidence() {
    try {
      const filePath = path.join(this.dataDir, "taskEvidence.json");
      const data = {
        taskEvidence: Array.from(this.taskEvidence.values()),
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error saving task evidence data:", error);
    }
  }

  // User operations
  async getUser(id: string): Promise<IUser | undefined> {
    if (!isValidObjectId(id)) return undefined;
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<IUser | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<IUser> {
    const id = this.generateObjectId();
    const user: IUser = {
      _id: id as any,
      username: insertUser.username,
      password: insertUser.password,
      name: insertUser.name,
      email: insertUser.email,
      role: insertUser.role,
      teamId: insertUser.teamId ? (insertUser.teamId as any) : undefined,
      lastActive: undefined,
      currentLocation: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    this.saveUsers();
    return user;
  }

  async updateUserLocation(
    id: string,
    location: { lat: number; lng: number },
  ): Promise<IUser> {
    if (!isValidObjectId(id)) throw new Error("Invalid user ID");

    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }

    user.currentLocation = {
      type: "Point",
      coordinates: [location.lng, location.lat],
    };
    user.lastActive = new Date();
    user.updatedAt = new Date();
    this.users.set(id, user);
    this.saveUsers();
    return user;
  }

  async updateUserLastActive(id: string): Promise<IUser> {
    if (!isValidObjectId(id)) throw new Error("Invalid user ID");

    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    user.lastActive = new Date();
    user.updatedAt = new Date();
    this.users.set(id, user);
    this.saveUsers();
    return user;
  }

  async getAllFieldUsers(): Promise<IUser[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.role === "Field",
    );
  }

  // Team operations
  async createTeam(insertTeam: InsertTeam): Promise<ITeam> {
    const id = this.generateObjectId();
    const team: ITeam = {
      _id: id as any,
      name: insertTeam.name,
      description: insertTeam.description,
      status: insertTeam.status || "Pending",
      createdBy: insertTeam.createdBy as any,
      approvedBy: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.teams.set(id, team);
    this.saveTeams();
    return team;
  }

  async getTeam(id: string): Promise<ITeam | undefined> {
    if (!isValidObjectId(id)) return undefined;
    return this.teams.get(id);
  }

  async getTeamByName(name: string): Promise<ITeam | undefined> {
    return Array.from(this.teams.values()).find((team) => team.name === name);
  }

  async updateTeamStatus(
    id: string,
    status: string,
    approvedBy?: string,
  ): Promise<ITeam> {
    if (!isValidObjectId(id)) throw new Error("Invalid team ID");
    if (approvedBy && !isValidObjectId(approvedBy))
      throw new Error("Invalid approver ID");

    const team = this.teams.get(id);
    if (!team) {
      throw new Error(`Team with id ${id} not found`);
    }
    team.status = status as any;
    team.updatedAt = new Date();
    if (approvedBy) {
      team.approvedBy = approvedBy as any;
    }
    this.teams.set(id, team);
    this.saveTeams();
    return team;
  }

  async getAllTeams(): Promise<ITeam[]> {
    return Array.from(this.teams.values());
  }

  async getUsersByTeam(teamId: string): Promise<IUser[]> {
    if (!isValidObjectId(teamId)) return [];
    return Array.from(this.users.values()).filter(
      (user) => user.teamId?.toString() === teamId,
    );
  }

  async assignUserToTeam(userId: string, teamId: string): Promise<IUser> {
    if (!isValidObjectId(userId) || !isValidObjectId(teamId)) {
      throw new Error("Invalid user or team ID");
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    user.teamId = teamId as any;
    user.updatedAt = new Date();
    this.users.set(userId, user);
    this.saveUsers();
    return user;
  }

  // Task operations
  async createTask(insertTask: InsertTask): Promise<ITask> {
    const id = this.generateObjectId();
    const task: ITask = {
      _id: id as any,
      title: insertTask.title,
      description: insertTask.description,
      status: insertTask.status || "Unassigned",
      priority: insertTask.priority,
      createdBy: insertTask.createdBy
        ? (insertTask.createdBy as any)
        : undefined,
      assignedTo: insertTask.assignedTo
        ? (insertTask.assignedTo as any)
        : undefined,
      dueDate: insertTask.dueDate,
      location: insertTask.location
        ? {
            type: "Point",
            coordinates: insertTask.location.coordinates,
          }
        : undefined,
      boundaryId: insertTask.boundaryId
        ? (insertTask.boundaryId as any)
        : undefined,
      featureId: insertTask.featureId
        ? (insertTask.featureId as any)
        : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.set(id, task);
    this.saveTasks();
    return task;
  }

  async getTask(id: string): Promise<ITask | undefined> {
    if (!isValidObjectId(id)) return undefined;
    return this.tasks.get(id);
  }

  async updateTaskStatus(
    id: string,
    status: string,
    userId: string,
  ): Promise<ITask> {
    if (!isValidObjectId(id) || !isValidObjectId(userId)) {
      throw new Error("Invalid task or user ID");
    }

    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }

    const oldStatus = task.status;
    task.status = status as any;
    task.updatedAt = new Date();
    this.tasks.set(id, task);
    this.saveTasks();

    // Create task update record
    await this.createTaskUpdate({
      taskId: id,
      userId: userId,
      oldStatus: oldStatus as any,
      newStatus: status as any,
      comment: `Status updated to ${status}`,
    });

    return task;
  }

  async assignTask(id: string, assignedTo: string): Promise<ITask> {
    if (!isValidObjectId(id) || !isValidObjectId(assignedTo)) {
      throw new Error("Invalid task or user ID");
    }

    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }
    task.assignedTo = assignedTo as any;
    task.status = "Assigned";
    task.updatedAt = new Date();
    this.tasks.set(id, task);
    this.saveTasks();
    return task;
  }

  async getTasksByAssignee(userId: string): Promise<ITask[]> {
    if (!isValidObjectId(userId)) return [];
    return Array.from(this.tasks.values()).filter(
      (task) => task.assignedTo?.toString() === userId,
    );
  }

  async getTasksByCreator(userId: string): Promise<ITask[]> {
    if (!isValidObjectId(userId)) return [];
    return Array.from(this.tasks.values()).filter(
      (task) => task.createdBy?.toString() === userId,
    );
  }

  async getTasksByTeam(teamId: string): Promise<ITask[]> {
    if (!isValidObjectId(teamId)) return [];
    
    // Find all users in the team
    const teamUsers = Array.from(this.users.values()).filter(
      user => user.teamId?.toString() === teamId
    );
    const userIds = teamUsers.map(user => user._id.toString());
    
    // Return tasks assigned to team members
    return Array.from(this.tasks.values()).filter(
      task => task.assignedTo && userIds.includes(task.assignedTo.toString())
    );
  }

  async getAllTasks(): Promise<ITask[]> {
    return Array.from(this.tasks.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  // Feature operations
  async createFeature(insertFeature: InsertFeature): Promise<IFeature> {
    const id = this.generateObjectId();
    const feature: IFeature = {
      _id: id as any,
      name: insertFeature.name,
      feaNo: insertFeature.feaNo,
      feaState: insertFeature.feaState,
      feaStatus: insertFeature.feaStatus,
      feaType: insertFeature.feaType,
      specificType: insertFeature.specificType,
      maintenance: insertFeature.maintenance || "None",
      maintenanceDate: insertFeature.maintenanceDate,
      geometry: insertFeature.geometry,
      remarks: insertFeature.remarks,
      createdBy: insertFeature.createdBy
        ? (insertFeature.createdBy as any)
        : undefined,
      boundaryId: insertFeature.boundaryId
        ? (insertFeature.boundaryId as any)
        : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUpdated: new Date(),
    };
    this.features.set(id, feature);
    this.saveFeatures();
    return feature;
  }

  async getFeature(id: string): Promise<IFeature | undefined> {
    if (!isValidObjectId(id)) return undefined;
    return this.features.get(id);
  }

  async updateFeature(
    id: string,
    featureUpdate: Partial<IFeature>,
  ): Promise<IFeature> {
    if (!isValidObjectId(id)) throw new Error("Invalid feature ID");

    const feature = this.features.get(id);
    if (!feature) {
      throw new Error(`Feature with id ${id} not found`);
    }
    const updatedFeature = {
      ...feature,
      ...featureUpdate,
      lastUpdated: new Date(),
      updatedAt: new Date(),
    };
    this.features.set(id, updatedFeature);
    this.saveFeatures();
    return updatedFeature;
  }

  async deleteFeature(id: string): Promise<boolean> {
    if (!isValidObjectId(id)) return false;
    const result = this.features.delete(id);
    this.saveFeatures();
    return result;
  }

  async getFeaturesByType(type: string): Promise<IFeature[]> {
    return Array.from(this.features.values()).filter(
      (feature) => feature.feaType === type,
    );
  }

  async getFeaturesByStatus(status: string): Promise<IFeature[]> {
    return Array.from(this.features.values()).filter(
      (feature) => feature.feaStatus === status,
    );
  }

  async getFeaturesByTeam(teamId: string): Promise<IFeature[]> {
    if (!isValidObjectId(teamId)) return [];
    
    // Find boundaries assigned to the team
    const teamBoundaries = Array.from(this.boundaries.values()).filter(
      boundary => boundary.assignedTo?.toString() === teamId
    );
    const boundaryIds = teamBoundaries.map(boundary => boundary._id.toString());
    
    // Return features within team's assigned boundaries
    return Array.from(this.features.values()).filter(
      feature => feature.boundaryId && boundaryIds.includes(feature.boundaryId.toString())
    );
  }

  async getAllFeatures(): Promise<IFeature[]> {
    return Array.from(this.features.values());
  }

  // Boundary operations
  async createBoundary(insertBoundary: InsertBoundary): Promise<IBoundary> {
    const id = this.generateObjectId();
    const boundary: IBoundary = {
      _id: id as any,
      name: insertBoundary.name,
      description: insertBoundary.description,
      status: insertBoundary.status || "New",
      assignedTo: insertBoundary.assignedTo
        ? (insertBoundary.assignedTo as any)
        : undefined,
      geometry: insertBoundary.geometry,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.boundaries.set(id, boundary);
    this.saveBoundaries();
    return boundary;
  }

  async getBoundary(id: string): Promise<IBoundary | undefined> {
    if (!isValidObjectId(id)) return undefined;
    return this.boundaries.get(id);
  }

  async updateBoundaryStatus(id: string, status: string): Promise<IBoundary> {
    if (!isValidObjectId(id)) throw new Error("Invalid boundary ID");

    const boundary = this.boundaries.get(id);
    if (!boundary) {
      throw new Error(`Boundary with id ${id} not found`);
    }
    boundary.status = status as any;
    boundary.updatedAt = new Date();
    this.boundaries.set(id, boundary);
    this.saveBoundaries();
    return boundary;
  }

  async assignBoundary(id: string, userId: string): Promise<IBoundary> {
    if (!isValidObjectId(id) || !isValidObjectId(userId)) {
      throw new Error("Invalid boundary or user ID");
    }

    const boundary = this.boundaries.get(id);
    if (!boundary) {
      throw new Error(`Boundary with id ${id} not found`);
    }
    boundary.assignedTo = userId as any;
    boundary.updatedAt = new Date();
    this.boundaries.set(id, boundary);
    this.saveBoundaries();
    return boundary;
  }

  async getAllBoundaries(): Promise<IBoundary[]> {
    return Array.from(this.boundaries.values());
  }

  async deleteBoundary(id: string): Promise<boolean> {
    if (!isValidObjectId(id)) return false;
    const result = this.boundaries.delete(id);
    this.saveBoundaries();
    return result;
  }

  // Task updates operations
  async createTaskUpdate(insertUpdate: InsertTaskUpdate): Promise<ITaskUpdate> {
    if (
      !isValidObjectId(insertUpdate.taskId) ||
      !isValidObjectId(insertUpdate.userId)
    ) {
      throw new Error("Invalid task or user ID");
    }

    const id = this.generateObjectId();
    const update: ITaskUpdate = {
      _id: id as any,
      taskId: insertUpdate.taskId as any,
      userId: insertUpdate.userId as any,
      comment: insertUpdate.comment,
      oldStatus: insertUpdate.oldStatus,
      newStatus: insertUpdate.newStatus,
      createdAt: new Date(),
    };
    this.taskUpdates.set(id, update);
    this.saveTaskUpdates();
    return update;
  }

  async getTaskUpdates(taskId: string): Promise<ITaskUpdate[]> {
    if (!isValidObjectId(taskId)) return [];
    return Array.from(this.taskUpdates.values())
      .filter((update) => update.taskId.toString() === taskId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Task evidence operations
  async addTaskEvidence(
    insertEvidence: InsertTaskEvidence,
  ): Promise<ITaskEvidence> {
    if (
      !isValidObjectId(insertEvidence.taskId) ||
      !isValidObjectId(insertEvidence.userId)
    ) {
      throw new Error("Invalid task or user ID");
    }

    const id = this.generateObjectId();
    const evidence: ITaskEvidence = {
      _id: id as any,
      taskId: insertEvidence.taskId as any,
      userId: insertEvidence.userId as any,
      imageUrl: insertEvidence.imageUrl,
      description: insertEvidence.description,
      createdAt: new Date(),
    };
    this.taskEvidence.set(id, evidence);
    this.saveTaskEvidence();
    return evidence;
  }

  async getTaskEvidence(taskId: string): Promise<ITaskEvidence[]> {
    if (!isValidObjectId(taskId)) return [];
    return Array.from(this.taskEvidence.values())
      .filter((evidence) => evidence.taskId.toString() === taskId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Utility methods for compatibility with MongoDB storage interface
  async getUsersNearLocation(
    longitude: number,
    latitude: number,
    maxDistance: number = 1000,
  ): Promise<IUser[]> {
    // Simple distance calculation for file storage (not as precise as MongoDB's geospatial queries)
    return Array.from(this.users.values()).filter((user) => {
      if (!user.currentLocation) return false;

      const [userLng, userLat] = user.currentLocation.coordinates;
      const distance = this.calculateDistance(
        latitude,
        longitude,
        userLat,
        userLng,
      );
      return distance <= maxDistance;
    });
  }

  async getFeaturesInBoundary(boundaryId: string): Promise<IFeature[]> {
    if (!isValidObjectId(boundaryId)) return [];
    return Array.from(this.features.values()).filter(
      (feature) => feature.boundaryId?.toString() === boundaryId,
    );
  }

  async getTasksInBoundary(boundaryId: string): Promise<ITask[]> {
    if (!isValidObjectId(boundaryId)) return [];
    return Array.from(this.tasks.values())
      .filter((task) => task.boundaryId?.toString() === boundaryId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getTaskStatsByUser(
    userId: string,
  ): Promise<{ status: string; count: number }[]> {
    if (!isValidObjectId(userId)) return [];

    const userTasks = Array.from(this.tasks.values()).filter(
      (task) => task.assignedTo?.toString() === userId,
    );

    const statusCounts = userTasks.reduce(
      (acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));
  }

  async getFeatureStatsByType(): Promise<{ type: string; count: number }[]> {
    const typeCounts = Array.from(this.features.values()).reduce(
      (acc, feature) => {
        acc[feature.feaType] = (acc[feature.feaType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(typeCounts).map(([type, count]) => ({ type, count }));
  }

  async bulkUpdateTaskStatus(
    taskIds: string[],
    status: string,
  ): Promise<number> {
    let updatedCount = 0;

    for (const taskId of taskIds) {
      if (!isValidObjectId(taskId)) continue;

      const task = this.tasks.get(taskId);
      if (task) {
        task.status = status as any;
        task.updatedAt = new Date();
        this.tasks.set(taskId, task);
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      this.saveTasks();
    }

    return updatedCount;
  }

  async searchFeatures(query: string): Promise<IFeature[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.features.values()).filter(
      (feature) =>
        feature.name.toLowerCase().includes(searchTerm) ||
        feature.feaNo.toLowerCase().includes(searchTerm) ||
        (feature.remarks && feature.remarks.toLowerCase().includes(searchTerm)),
    );
  }

  async searchTasks(query: string): Promise<ITask[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.tasks.values()).filter(
      (task) =>
        task.title.toLowerCase().includes(searchTerm) ||
        (task.description &&
          task.description.toLowerCase().includes(searchTerm)),
    );
  }

  // Helper method to calculate distance between two points (Haversine formula)
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

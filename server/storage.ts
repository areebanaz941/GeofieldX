import {
  IUser, ITeam, ITask, IFeature, IBoundary, ITaskUpdate, ITaskEvidence, ITaskSubmission, IShapefile,
  InsertUser, InsertTeam, InsertTask, InsertFeature, InsertBoundary, InsertTaskUpdate, InsertTaskEvidence, InsertTaskSubmission, InsertShapefile
} from "@shared/schema";
import { Types } from "mongoose";

// Define the storage interface for data access
export interface IStorage {
  // User operations
  getUser(id: string): Promise<IUser | undefined>;
  getUserByUsername(username: string): Promise<IUser | undefined>;
  createUser(userData: InsertUser): Promise<IUser>;
  updateUserLocation(id: string, location: { lat: number, lng: number }): Promise<IUser>;
  updateUserLastActive(id: string): Promise<IUser>;
  getAllFieldUsers(): Promise<IUser[]>;
  
  // Team operations
  createTeam(teamData: InsertTeam): Promise<ITeam>;
  getTeam(id: string): Promise<ITeam | undefined>;
  getTeamByName(name: string): Promise<ITeam | undefined>;
  updateTeamStatus(id: string, status: string, approvedBy?: string): Promise<ITeam>;
  deleteTeam(id: string): Promise<boolean>;
  getAllTeams(): Promise<ITeam[]>;
  getUsersByTeam(teamId: string): Promise<IUser[]>;
  assignUserToTeam(userId: string, teamId: string): Promise<IUser>;
  unassignUserFromTeam(userId: string): Promise<IUser>;
  
  // Task operations
  createTask(taskData: InsertTask): Promise<ITask>;
  getTask(id: string): Promise<ITask | undefined>;
  updateTaskStatus(id: string, status: string, userId: string): Promise<ITask>;
  assignTask(id: string, assignedTo: string): Promise<ITask>;
  deleteTask(id: string): Promise<boolean>;
  getTasksByAssignee(userId: string): Promise<ITask[]>;
  getTasksByCreator(userId: string): Promise<ITask[]>;
  getTasksByTeam(teamId: string): Promise<ITask[]>;
  getAllTasks(): Promise<ITask[]>;
  
  // Feature operations
  createFeature(featureData: InsertFeature): Promise<IFeature>;
  getFeature(id: string): Promise<IFeature | undefined>;
  updateFeature(id: string, feature: Partial<InsertFeature>): Promise<IFeature>;
  deleteFeature(id: string): Promise<boolean>;
  getFeaturesByType(type: string): Promise<IFeature[]>;
  getFeaturesByStatus(status: string): Promise<IFeature[]>;
  getFeaturesByTeam(teamId: string): Promise<IFeature[]>;
  getAllFeatures(): Promise<IFeature[]>;
  
  // Boundary operations
  createBoundary(boundaryData: InsertBoundary): Promise<IBoundary>;
  getBoundary(id: string): Promise<IBoundary | undefined>;
  updateBoundaryStatus(id: string, status: string): Promise<IBoundary>;
  assignBoundary(id: string, userId: string): Promise<IBoundary>;
  getAllBoundaries(): Promise<IBoundary[]>;
  deleteBoundary(id: string): Promise<boolean>;
  updateBoundary(id: string, boundary: Partial<InsertBoundary>): Promise<IBoundary>;
  
  // Task update operations
  createTaskUpdate(updateData: InsertTaskUpdate): Promise<ITaskUpdate>;
  getTaskUpdates(taskId: string): Promise<ITaskUpdate[]>;
  
  // Task evidence operations
  addTaskEvidence(evidenceData: InsertTaskEvidence): Promise<ITaskEvidence>;
  getTaskEvidence(taskId: string): Promise<ITaskEvidence[]>;
  deleteTaskEvidence(taskId: string, evidenceId: string): Promise<boolean>;
  
  // Task submission operations
  createTaskSubmission(submissionData: InsertTaskSubmission): Promise<ITaskSubmission>;
  getTaskSubmissions(taskId: string): Promise<ITaskSubmission[]>;
  getTaskSubmissionsByTeam(teamId: string): Promise<ITaskSubmission[]>;
  updateSubmissionStatus(submissionId: string, status: string, reviewedBy: string, reviewComments?: string): Promise<ITaskSubmission>;
  
  // Shapefile operations
  createShapefile(shapefileData: InsertShapefile): Promise<IShapefile>;
  getShapefile(id: string): Promise<IShapefile | undefined>;
  getAllShapefiles(): Promise<IShapefile[]>;
  getShapefilesByTeam(teamId: string): Promise<IShapefile[]>;
  getShapefilesByUser(userId: string): Promise<IShapefile[]>;
  updateShapefileVisibility(id: string, isVisible: boolean): Promise<IShapefile>;
  deleteShapefile(id: string): Promise<boolean>;
}

// In-memory storage implementation as a fallback (stub)
export class MemStorage implements IStorage {
  constructor() {
    console.log('Initializing in-memory storage');
  }

  // All methods throw errors since this is a stub
  async getUser(id: string): Promise<IUser | undefined> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getUserByUsername(username: string): Promise<IUser | undefined> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async createUser(userData: InsertUser): Promise<IUser> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async updateUserLocation(id: string, location: { lat: number, lng: number }): Promise<IUser> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async updateUserLastActive(id: string): Promise<IUser> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getAllFieldUsers(): Promise<IUser[]> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async createTeam(teamData: InsertTeam): Promise<ITeam> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getTeam(id: string): Promise<ITeam | undefined> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getTeamByName(name: string): Promise<ITeam | undefined> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async updateTeamStatus(id: string, status: string, approvedBy?: string): Promise<ITeam> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getAllTeams(): Promise<ITeam[]> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getUsersByTeam(teamId: string): Promise<IUser[]> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async assignUserToTeam(userId: string, teamId: string): Promise<IUser> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async unassignUserFromTeam(userId: string): Promise<IUser> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async deleteTeam(id: string): Promise<boolean> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async createTask(taskData: InsertTask): Promise<ITask> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getTask(id: string): Promise<ITask | undefined> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async updateTaskStatus(id: string, status: string, userId: string): Promise<ITask> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async assignTask(id: string, assignedTo: string): Promise<ITask> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async deleteTask(id: string): Promise<boolean> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getTasksByAssignee(userId: string): Promise<ITask[]> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getTasksByCreator(userId: string): Promise<ITask[]> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getTasksByTeam(teamId: string): Promise<ITask[]> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getAllTasks(): Promise<ITask[]> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async createFeature(featureData: InsertFeature): Promise<IFeature> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getFeature(id: string): Promise<IFeature | undefined> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async updateFeature(id: string, feature: Partial<InsertFeature>): Promise<IFeature> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async deleteFeature(id: string): Promise<boolean> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getFeaturesByType(type: string): Promise<IFeature[]> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getFeaturesByStatus(status: string): Promise<IFeature[]> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getFeaturesByTeam(teamId: string): Promise<IFeature[]> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getAllFeatures(): Promise<IFeature[]> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async createBoundary(boundaryData: InsertBoundary): Promise<IBoundary> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getBoundary(id: string): Promise<IBoundary | undefined> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async updateBoundaryStatus(id: string, status: string): Promise<IBoundary> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async assignBoundary(id: string, userId: string): Promise<IBoundary> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getAllBoundaries(): Promise<IBoundary[]> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async deleteBoundary(id: string): Promise<boolean> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async createTaskUpdate(updateData: InsertTaskUpdate): Promise<ITaskUpdate> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getTaskUpdates(taskId: string): Promise<ITaskUpdate[]> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async addTaskEvidence(evidenceData: InsertTaskEvidence): Promise<ITaskEvidence> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getTaskEvidence(taskId: string): Promise<ITaskEvidence[]> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async deleteTaskEvidence(taskId: string, evidenceId: string): Promise<boolean> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async createTaskSubmission(submissionData: InsertTaskSubmission): Promise<ITaskSubmission> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getTaskSubmissions(taskId: string): Promise<ITaskSubmission[]> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getTaskSubmissionsByTeam(teamId: string): Promise<ITaskSubmission[]> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async updateSubmissionStatus(submissionId: string, status: string, reviewedBy: string, reviewComments?: string): Promise<ITaskSubmission> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async createShapefile(shapefileData: InsertShapefile): Promise<IShapefile> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getShapefile(id: string): Promise<IShapefile | undefined> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getAllShapefiles(): Promise<IShapefile[]> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getShapefilesByTeam(teamId: string): Promise<IShapefile[]> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async getShapefilesByUser(userId: string): Promise<IShapefile[]> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async updateShapefileVisibility(id: string, isVisible: boolean): Promise<IShapefile> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  async deleteShapefile(id: string): Promise<boolean> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }

  // NEW: Stub for updateBoundary
  async updateBoundary(id: string, boundary: Partial<InsertBoundary>): Promise<IBoundary> {
    throw new Error('MemStorage is a stub - use MongoStorage instead');
  }
}

// Storage singleton instance
export let storage: IStorage = new MemStorage();

// Export a function to set the storage implementation
export function setStorage(newStorage: IStorage) {
  storage = newStorage;
  console.log('Storage implementation set to:', newStorage.constructor.name);
}
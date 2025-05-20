import { users, tasks, features, boundaries, taskUpdates, taskEvidence, teams } from "@shared/schema";
import type { 
  User, InsertUser, 
  Task, InsertTask, 
  Feature, InsertFeature, 
  Boundary, InsertBoundary,
  TaskUpdate, InsertTaskUpdate,
  TaskEvidence, InsertTaskEvidence,
  Team, InsertTeam,
  UserWithLocation, UserWithTeam
} from "@shared/schema";
import bcrypt from 'bcryptjs';

// Interface for our storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLocation(id: number, location: { lat: number, lng: number }): Promise<User>;
  updateUserLastActive(id: number): Promise<User>;
  getAllFieldUsers(): Promise<User[]>;
  
  // Task operations
  createTask(task: InsertTask): Promise<Task>;
  getTask(id: number): Promise<Task | undefined>;
  updateTaskStatus(id: number, status: string, userId: number): Promise<Task>;
  assignTask(id: number, assignedTo: number): Promise<Task>;
  getTasksByAssignee(userId: number): Promise<Task[]>;
  getTasksByCreator(userId: number): Promise<Task[]>;
  getAllTasks(): Promise<Task[]>;
  
  // Feature operations
  createFeature(feature: InsertFeature): Promise<Feature>;
  getFeature(id: number): Promise<Feature | undefined>;
  updateFeature(id: number, feature: Partial<Feature>): Promise<Feature>;
  deleteFeature(id: number): Promise<boolean>;
  getFeaturesByType(type: string): Promise<Feature[]>;
  getFeaturesByStatus(status: string): Promise<Feature[]>;
  getAllFeatures(): Promise<Feature[]>;
  
  // Boundary operations
  createBoundary(boundary: InsertBoundary): Promise<Boundary>;
  getBoundary(id: number): Promise<Boundary | undefined>;
  updateBoundaryStatus(id: number, status: string): Promise<Boundary>;
  assignBoundary(id: number, userId: number): Promise<Boundary>;
  getAllBoundaries(): Promise<Boundary[]>;
  
  // Task updates operations
  createTaskUpdate(update: InsertTaskUpdate): Promise<TaskUpdate>;
  getTaskUpdates(taskId: number): Promise<TaskUpdate[]>;
  
  // Task evidence operations
  addTaskEvidence(evidence: InsertTaskEvidence): Promise<TaskEvidence>;
  getTaskEvidence(taskId: number): Promise<TaskEvidence[]>;
  
  // Team operations
  createTeam(team: InsertTeam): Promise<Team>;
  getTeam(id: number): Promise<Team | undefined>;
  getTeamByName(name: string): Promise<Team | undefined>;
  updateTeamStatus(id: number, status: string, approvedBy?: number): Promise<Team>;
  getAllTeams(): Promise<Team[]>;
  getUsersByTeam(teamId: number): Promise<User[]>;
  assignUserToTeam(userId: number, teamId: number): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tasks: Map<number, Task>;
  private features: Map<number, Feature>;
  private boundaries: Map<number, Boundary>;
  private taskUpdates: Map<number, TaskUpdate>;
  private taskEvidence: Map<number, TaskEvidence>;
  
  private userCurrentId: number;
  private taskCurrentId: number;
  private featureCurrentId: number;
  private boundaryCurrentId: number;
  private taskUpdateCurrentId: number;
  private taskEvidenceCurrentId: number;

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.features = new Map();
    this.boundaries = new Map();
    this.taskUpdates = new Map();
    this.taskEvidence = new Map();
    
    this.userCurrentId = 1;
    this.taskCurrentId = 1;
    this.featureCurrentId = 1;
    this.boundaryCurrentId = 1;
    this.taskUpdateCurrentId = 1;
    this.taskEvidenceCurrentId = 1;
    
    // Initialize with a supervisor user
    this.createUser({
      username: 'supervisor',
      password: bcrypt.hashSync('password', 10),
      name: 'John Doe',
      email: 'supervisor@geowhats.com',
      role: 'Supervisor'
    });

    // Initialize with a field user
    this.createUser({
      username: 'fielduser',
      password: bcrypt.hashSync('password', 10),
      name: 'Alex Johnson',
      email: 'alex@geowhats.com',
      role: 'Field'
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { 
      ...insertUser, 
      id,
      lastActive: new Date(),
      currentLocation: null,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserLocation(id: number, location: { lat: number, lng: number }): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error(`User with id ${id} not found`);
    
    const currentLocation = {
      type: "Point",
      coordinates: [location.lng, location.lat]
    };
    
    const updatedUser = { ...user, currentLocation, lastActive: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserLastActive(id: number): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error(`User with id ${id} not found`);
    
    const updatedUser = { ...user, lastActive: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllFieldUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === 'Field');
  }

  // Task operations
  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.taskCurrentId++;
    const task: Task = {
      ...insertTask,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.tasks.set(id, task);
    return task;
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async updateTaskStatus(id: number, status: string, userId: number): Promise<Task> {
    const task = await this.getTask(id);
    if (!task) throw new Error(`Task with id ${id} not found`);
    
    const oldStatus = task.status;
    const updatedTask = { ...task, status: status as any, updatedAt: new Date() };
    this.tasks.set(id, updatedTask);
    
    // Create a task update record
    await this.createTaskUpdate({
      taskId: id,
      userId,
      oldStatus: oldStatus,
      newStatus: status as any,
      comment: `Status changed from ${oldStatus} to ${status}`
    });
    
    return updatedTask;
  }

  async assignTask(id: number, assignedTo: number): Promise<Task> {
    const task = await this.getTask(id);
    if (!task) throw new Error(`Task with id ${id} not found`);
    
    const updatedTask = { 
      ...task, 
      assignedTo, 
      status: 'Assigned', 
      updatedAt: new Date() 
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async getTasksByAssignee(userId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.assignedTo === userId);
  }

  async getTasksByCreator(userId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.createdBy === userId);
  }

  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  // Feature operations
  async createFeature(insertFeature: InsertFeature): Promise<Feature> {
    const id = this.featureCurrentId++;
    const feature: Feature = {
      ...insertFeature,
      id,
      lastUpdated: new Date(),
      createdAt: new Date()
    };
    this.features.set(id, feature);
    return feature;
  }

  async getFeature(id: number): Promise<Feature | undefined> {
    return this.features.get(id);
  }

  async updateFeature(id: number, featureUpdate: Partial<Feature>): Promise<Feature> {
    const feature = await this.getFeature(id);
    if (!feature) throw new Error(`Feature with id ${id} not found`);
    
    const updatedFeature = { 
      ...feature, 
      ...featureUpdate,
      lastUpdated: new Date() 
    };
    this.features.set(id, updatedFeature);
    return updatedFeature;
  }

  async deleteFeature(id: number): Promise<boolean> {
    return this.features.delete(id);
  }

  async getFeaturesByType(type: string): Promise<Feature[]> {
    return Array.from(this.features.values()).filter(feature => feature.feaType === type);
  }

  async getFeaturesByStatus(status: string): Promise<Feature[]> {
    return Array.from(this.features.values()).filter(feature => feature.feaStatus === status);
  }

  async getAllFeatures(): Promise<Feature[]> {
    return Array.from(this.features.values());
  }

  // Boundary operations
  async createBoundary(insertBoundary: InsertBoundary): Promise<Boundary> {
    const id = this.boundaryCurrentId++;
    const boundary: Boundary = {
      ...insertBoundary,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.boundaries.set(id, boundary);
    return boundary;
  }

  async getBoundary(id: number): Promise<Boundary | undefined> {
    return this.boundaries.get(id);
  }

  async updateBoundaryStatus(id: number, status: string): Promise<Boundary> {
    const boundary = await this.getBoundary(id);
    if (!boundary) throw new Error(`Boundary with id ${id} not found`);
    
    const updatedBoundary = { 
      ...boundary, 
      status: status as any, 
      updatedAt: new Date() 
    };
    this.boundaries.set(id, updatedBoundary);
    return updatedBoundary;
  }

  async assignBoundary(id: number, userId: number): Promise<Boundary> {
    const boundary = await this.getBoundary(id);
    if (!boundary) throw new Error(`Boundary with id ${id} not found`);
    
    const updatedBoundary = { 
      ...boundary, 
      assignedTo: userId, 
      status: 'Assigned', 
      updatedAt: new Date() 
    };
    this.boundaries.set(id, updatedBoundary);
    return updatedBoundary;
  }

  async getAllBoundaries(): Promise<Boundary[]> {
    return Array.from(this.boundaries.values());
  }

  // Task updates operations
  async createTaskUpdate(insertUpdate: InsertTaskUpdate): Promise<TaskUpdate> {
    const id = this.taskUpdateCurrentId++;
    const update: TaskUpdate = {
      ...insertUpdate,
      id,
      createdAt: new Date()
    };
    this.taskUpdates.set(id, update);
    return update;
  }

  async getTaskUpdates(taskId: number): Promise<TaskUpdate[]> {
    return Array.from(this.taskUpdates.values())
      .filter(update => update.taskId === taskId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Task evidence operations
  async addTaskEvidence(insertEvidence: InsertTaskEvidence): Promise<TaskEvidence> {
    const id = this.taskEvidenceCurrentId++;
    const evidence: TaskEvidence = {
      ...insertEvidence,
      id,
      createdAt: new Date()
    };
    this.taskEvidence.set(id, evidence);
    return evidence;
  }

  async getTaskEvidence(taskId: number): Promise<TaskEvidence[]> {
    return Array.from(this.taskEvidence.values()).filter(evidence => evidence.taskId === taskId);
  }
}

export const storage = new MemStorage();

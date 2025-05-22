import { User, Team, Task, Feature, Boundary, TaskUpdate, TaskEvidence } from "@shared/schema";

// Define the storage interface for data access
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: any): Promise<User>;
  updateUserLocation(id: number, location: { lat: number, lng: number }): Promise<User>;
  updateUserLastActive(id: number): Promise<User>;
  getAllFieldUsers(): Promise<User[]>;
  
  // Team operations
  createTeam(team: any): Promise<Team>;
  getTeam(id: number): Promise<Team | undefined>;
  getTeamByName(name: string): Promise<Team | undefined>;
  updateTeamStatus(id: number, status: string, approvedBy?: number): Promise<Team>;
  getAllTeams(): Promise<Team[]>;
  getUsersByTeam(teamId: number): Promise<User[]>;
  assignUserToTeam(userId: number, teamId: number): Promise<User>;
  
  // Task operations
  createTask(task: any): Promise<Task>;
  getTask(id: number): Promise<Task | undefined>;
  updateTaskStatus(id: number, status: string, userId: number): Promise<Task>;
  assignTask(id: number, assignedTo: number): Promise<Task>;
  getTasksByAssignee(userId: number): Promise<Task[]>;
  getTasksByCreator(userId: number): Promise<Task[]>;
  getAllTasks(): Promise<Task[]>;
  
  // Feature operations
  createFeature(feature: any): Promise<Feature>;
  getFeature(id: number): Promise<Feature | undefined>;
  updateFeature(id: number, feature: Partial<Feature>): Promise<Feature>;
  deleteFeature(id: number): Promise<boolean>;
  getFeaturesByType(type: string): Promise<Feature[]>;
  getFeaturesByStatus(status: string): Promise<Feature[]>;
  getAllFeatures(): Promise<Feature[]>;
  
  // Boundary operations
  createBoundary(boundary: any): Promise<Boundary>;
  getBoundary(id: number): Promise<Boundary | undefined>;
  updateBoundaryStatus(id: number, status: string): Promise<Boundary>;
  assignBoundary(id: number, userId: number): Promise<Boundary>;
  getAllBoundaries(): Promise<Boundary[]>;
  
  // Task update operations
  createTaskUpdate(update: any): Promise<TaskUpdate>;
  getTaskUpdates(taskId: number): Promise<TaskUpdate[]>;
  
  // Task evidence operations
  addTaskEvidence(evidence: any): Promise<TaskEvidence>;
  getTaskEvidence(taskId: number): Promise<TaskEvidence[]>;
}

// In-memory storage implementation as a fallback
export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private teams: Map<number, Team> = new Map();
  private tasks: Map<number, Task> = new Map();
  private features: Map<number, Feature> = new Map();
  private boundaries: Map<number, Boundary> = new Map();
  private taskUpdates: Map<number, TaskUpdate> = new Map();
  private taskEvidence: Map<number, TaskEvidence> = new Map();
  
  private userCurrentId = 1;
  private teamCurrentId = 1;
  private taskCurrentId = 1;
  private featureCurrentId = 1;
  private boundaryCurrentId = 1;
  private taskUpdateCurrentId = 1;
  private taskEvidenceCurrentId = 1;

  constructor() {
    console.log('Initializing in-memory storage');
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async createUser(insertUser: any): Promise<User> {
    const id = this.userCurrentId++;
    const user = {
      id,
      ...insertUser,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActive: null,
      currentLocation: null,
    } as User;
    
    this.users.set(id, user);
    return user;
  }

  async updateUserLocation(id: number, location: { lat: number, lng: number }): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    user.currentLocation = { 
      type: 'Point',
      coordinates: [location.lng, location.lat]
    } as any;
    user.updatedAt = new Date();
    
    return user;
  }

  async updateUserLastActive(id: number): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    user.lastActive = new Date();
    user.updatedAt = new Date();
    
    return user;
  }

  async getAllFieldUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.role === 'Field'
    );
  }

  // Team methods
  async createTeam(insertTeam: any): Promise<Team> {
    const id = this.teamCurrentId++;
    const team = {
      id,
      ...insertTeam,
      createdAt: new Date(),
      updatedAt: new Date(),
      approvedBy: null,
    } as Team;
    
    this.teams.set(id, team);
    return team;
  }

  async getTeam(id: number): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async getTeamByName(name: string): Promise<Team | undefined> {
    return Array.from(this.teams.values()).find(
      (team) => team.name.toLowerCase() === name.toLowerCase()
    );
  }

  async updateTeamStatus(id: number, status: string, approvedBy?: number): Promise<Team> {
    const team = await this.getTeam(id);
    if (!team) {
      throw new Error(`Team with ID ${id} not found`);
    }
    
    team.status = status as any;
    team.updatedAt = new Date();
    
    if (approvedBy) {
      team.approvedBy = approvedBy;
    }
    
    return team;
  }

  async getAllTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  async getUsersByTeam(teamId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.teamId === teamId
    );
  }

  async assignUserToTeam(userId: number, teamId: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    const team = await this.getTeam(teamId);
    if (!team) {
      throw new Error(`Team with ID ${teamId} not found`);
    }
    
    user.teamId = teamId;
    user.updatedAt = new Date();
    
    return user;
  }

  // Task methods
  async createTask(insertTask: any): Promise<Task> {
    const id = this.taskCurrentId++;
    const task = {
      id,
      ...insertTask,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Task;
    
    this.tasks.set(id, task);
    return task;
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async updateTaskStatus(id: number, status: string, userId: number): Promise<Task> {
    const task = await this.getTask(id);
    if (!task) {
      throw new Error(`Task with ID ${id} not found`);
    }
    
    task.status = status as any;
    task.updatedAt = new Date();
    
    return task;
  }

  async assignTask(id: number, assignedTo: number): Promise<Task> {
    const task = await this.getTask(id);
    if (!task) {
      throw new Error(`Task with ID ${id} not found`);
    }
    
    task.assignedTo = assignedTo;
    task.status = 'Assigned' as any;
    task.updatedAt = new Date();
    
    return task;
  }

  async getTasksByAssignee(userId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.assignedTo === userId
    );
  }

  async getTasksByCreator(userId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.createdBy === userId
    );
  }

  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  // Feature methods
  async createFeature(insertFeature: any): Promise<Feature> {
    const id = this.featureCurrentId++;
    const feature = {
      id,
      ...insertFeature,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUpdated: new Date(),
    } as Feature;
    
    this.features.set(id, feature);
    return feature;
  }

  async getFeature(id: number): Promise<Feature | undefined> {
    return this.features.get(id);
  }

  async updateFeature(id: number, featureUpdate: Partial<Feature>): Promise<Feature> {
    const feature = await this.getFeature(id);
    if (!feature) {
      throw new Error(`Feature with ID ${id} not found`);
    }
    
    const updatedFeature = { ...feature, ...featureUpdate };
    updatedFeature.updatedAt = new Date();
    updatedFeature.lastUpdated = new Date();
    
    this.features.set(id, updatedFeature as Feature);
    return updatedFeature as Feature;
  }

  async deleteFeature(id: number): Promise<boolean> {
    return this.features.delete(id);
  }

  async getFeaturesByType(type: string): Promise<Feature[]> {
    return Array.from(this.features.values()).filter(
      (feature) => feature.feaType === type
    );
  }

  async getFeaturesByStatus(status: string): Promise<Feature[]> {
    return Array.from(this.features.values()).filter(
      (feature) => feature.feaStatus === status
    );
  }

  async getAllFeatures(): Promise<Feature[]> {
    return Array.from(this.features.values());
  }

  // Boundary methods
  async createBoundary(insertBoundary: any): Promise<Boundary> {
    const id = this.boundaryCurrentId++;
    const boundary = {
      id,
      ...insertBoundary,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Boundary;
    
    this.boundaries.set(id, boundary);
    return boundary;
  }

  async getBoundary(id: number): Promise<Boundary | undefined> {
    return this.boundaries.get(id);
  }

  async updateBoundaryStatus(id: number, status: string): Promise<Boundary> {
    const boundary = await this.getBoundary(id);
    if (!boundary) {
      throw new Error(`Boundary with ID ${id} not found`);
    }
    
    boundary.status = status as any;
    boundary.updatedAt = new Date();
    
    return boundary;
  }

  async assignBoundary(id: number, userId: number): Promise<Boundary> {
    const boundary = await this.getBoundary(id);
    if (!boundary) {
      throw new Error(`Boundary with ID ${id} not found`);
    }
    
    boundary.assignedTo = userId;
    boundary.updatedAt = new Date();
    
    return boundary;
  }

  async getAllBoundaries(): Promise<Boundary[]> {
    return Array.from(this.boundaries.values());
  }

  // Task update methods
  async createTaskUpdate(insertUpdate: any): Promise<TaskUpdate> {
    const id = this.taskUpdateCurrentId++;
    const update = {
      id,
      ...insertUpdate,
      createdAt: new Date(),
    } as TaskUpdate;
    
    this.taskUpdates.set(id, update);
    return update;
  }

  async getTaskUpdates(taskId: number): Promise<TaskUpdate[]> {
    return Array.from(this.taskUpdates.values()).filter(
      (update) => update.taskId === taskId
    );
  }

  // Task evidence methods
  async addTaskEvidence(insertEvidence: any): Promise<TaskEvidence> {
    const id = this.taskEvidenceCurrentId++;
    const evidence = {
      id,
      ...insertEvidence,
      createdAt: new Date(),
    } as TaskEvidence;
    
    this.taskEvidence.set(id, evidence);
    return evidence;
  }

  async getTaskEvidence(taskId: number): Promise<TaskEvidence[]> {
    return Array.from(this.taskEvidence.values()).filter(
      (evidence) => evidence.taskId === taskId
    );
  }
}

// Storage singleton instance
export let storage: IStorage = new MemStorage();

// Export a function to set the storage implementation
export function setStorage(newStorage: IStorage) {
  storage = newStorage;
  console.log('Storage implementation set to:', newStorage.constructor.name);
}
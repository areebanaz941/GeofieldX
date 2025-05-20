import fs from 'fs';
import path from 'path';
import { IStorage } from './storage';
import {
  User, InsertUser,
  Task, InsertTask,
  Feature, InsertFeature,
  Boundary, InsertBoundary,
  TaskUpdate, InsertTaskUpdate,
  TaskEvidence, InsertTaskEvidence,
  Team, InsertTeam
} from '@shared/schema';

/**
 * FileStorage implementation of IStorage interface
 * This class stores data in local JSON files to persist between app restarts
 */
export class FileStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private tasks: Map<number, Task> = new Map();
  private features: Map<number, Feature> = new Map();
  private boundaries: Map<number, Boundary> = new Map();
  private taskUpdates: Map<number, TaskUpdate> = new Map();
  private taskEvidence: Map<number, TaskEvidence> = new Map();
  private teams: Map<number, Team> = new Map();

  private userCurrentId: number = 1;
  private taskCurrentId: number = 1;
  private featureCurrentId: number = 1;
  private boundaryCurrentId: number = 1;
  private taskUpdateCurrentId: number = 1;
  private taskEvidenceCurrentId: number = 1;
  private teamCurrentId: number = 1;

  private dataDir: string;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.loadAllData();
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
      const filePath = path.join(this.dataDir, 'users.json');
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.users = new Map(data.users.map((user: User) => [user.id, user]));
        this.userCurrentId = data.currentId;
      }
    } catch (error) {
      console.error('Error loading users data:', error);
    }
  }

  private saveUsers() {
    try {
      const filePath = path.join(this.dataDir, 'users.json');
      const data = {
        users: Array.from(this.users.values()),
        currentId: this.userCurrentId
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving users data:', error);
    }
  }

  private loadTeams() {
    try {
      const filePath = path.join(this.dataDir, 'teams.json');
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.teams = new Map(data.teams.map((team: Team) => [team.id, team]));
        this.teamCurrentId = data.currentId;
      }
    } catch (error) {
      console.error('Error loading teams data:', error);
    }
  }

  private saveTeams() {
    try {
      const filePath = path.join(this.dataDir, 'teams.json');
      const data = {
        teams: Array.from(this.teams.values()),
        currentId: this.teamCurrentId
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving teams data:', error);
    }
  }

  private loadTasks() {
    try {
      const filePath = path.join(this.dataDir, 'tasks.json');
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.tasks = new Map(data.tasks.map((task: Task) => [task.id, task]));
        this.taskCurrentId = data.currentId;
      }
    } catch (error) {
      console.error('Error loading tasks data:', error);
    }
  }

  private saveTasks() {
    try {
      const filePath = path.join(this.dataDir, 'tasks.json');
      const data = {
        tasks: Array.from(this.tasks.values()),
        currentId: this.taskCurrentId
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving tasks data:', error);
    }
  }

  private loadFeatures() {
    try {
      const filePath = path.join(this.dataDir, 'features.json');
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.features = new Map(data.features.map((feature: Feature) => [feature.id, feature]));
        this.featureCurrentId = data.currentId;
      }
    } catch (error) {
      console.error('Error loading features data:', error);
    }
  }

  private saveFeatures() {
    try {
      const filePath = path.join(this.dataDir, 'features.json');
      const data = {
        features: Array.from(this.features.values()),
        currentId: this.featureCurrentId
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving features data:', error);
    }
  }

  private loadBoundaries() {
    try {
      const filePath = path.join(this.dataDir, 'boundaries.json');
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.boundaries = new Map(data.boundaries.map((boundary: Boundary) => [boundary.id, boundary]));
        this.boundaryCurrentId = data.currentId;
      }
    } catch (error) {
      console.error('Error loading boundaries data:', error);
    }
  }

  private saveBoundaries() {
    try {
      const filePath = path.join(this.dataDir, 'boundaries.json');
      const data = {
        boundaries: Array.from(this.boundaries.values()),
        currentId: this.boundaryCurrentId
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving boundaries data:', error);
    }
  }

  private loadTaskUpdates() {
    try {
      const filePath = path.join(this.dataDir, 'taskUpdates.json');
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.taskUpdates = new Map(data.taskUpdates.map((update: TaskUpdate) => [update.id, update]));
        this.taskUpdateCurrentId = data.currentId;
      }
    } catch (error) {
      console.error('Error loading task updates data:', error);
    }
  }

  private saveTaskUpdates() {
    try {
      const filePath = path.join(this.dataDir, 'taskUpdates.json');
      const data = {
        taskUpdates: Array.from(this.taskUpdates.values()),
        currentId: this.taskUpdateCurrentId
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving task updates data:', error);
    }
  }

  private loadTaskEvidence() {
    try {
      const filePath = path.join(this.dataDir, 'taskEvidence.json');
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        this.taskEvidence = new Map(data.taskEvidence.map((evidence: TaskEvidence) => [evidence.id, evidence]));
        this.taskEvidenceCurrentId = data.currentId;
      }
    } catch (error) {
      console.error('Error loading task evidence data:', error);
    }
  }

  private saveTaskEvidence() {
    try {
      const filePath = path.join(this.dataDir, 'taskEvidence.json');
      const data = {
        taskEvidence: Array.from(this.taskEvidence.values()),
        currentId: this.taskEvidenceCurrentId
      };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving task evidence data:', error);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      name: insertUser.name,
      email: insertUser.email,
      role: insertUser.role,
      teamId: insertUser.teamId || null,
      lastActive: null,
      currentLocation: null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    this.saveUsers();
    return user;
  }

  async updateUserLocation(id: number, location: { lat: number, lng: number }): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    user.currentLocation = location;
    user.lastActive = new Date();
    this.users.set(id, user);
    this.saveUsers();
    return user;
  }

  async updateUserLastActive(id: number): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    user.lastActive = new Date();
    this.users.set(id, user);
    this.saveUsers();
    return user;
  }

  async getAllFieldUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.role === 'Field'
    );
  }

  // Team operations
  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const id = this.teamCurrentId++;
    const team: Team = {
      id,
      name: insertTeam.name,
      description: insertTeam.description || null,
      status: insertTeam.status || 'Pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      approvedBy: null
    };
    this.teams.set(id, team);
    this.saveTeams();
    return team;
  }

  async getTeam(id: number): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async getTeamByName(name: string): Promise<Team | undefined> {
    return Array.from(this.teams.values()).find(
      (team) => team.name === name
    );
  }

  async updateTeamStatus(id: number, status: string, approvedBy?: number): Promise<Team> {
    const team = this.teams.get(id);
    if (!team) {
      throw new Error(`Team with id ${id} not found`);
    }
    team.status = status as any;
    team.updatedAt = new Date();
    if (approvedBy) {
      team.approvedBy = approvedBy;
    }
    this.teams.set(id, team);
    this.saveTeams();
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
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    user.teamId = teamId;
    this.users.set(userId, user);
    this.saveUsers();
    return user;
  }

  // Task operations
  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.taskCurrentId++;
    const task: Task = {
      id,
      title: insertTask.title,
      description: insertTask.description || null,
      status: insertTask.status || 'Unassigned',
      priority: insertTask.priority,
      createdBy: insertTask.createdBy || null,
      assignedTo: insertTask.assignedTo || null,
      dueDate: insertTask.dueDate || null,
      location: insertTask.location || null,
      boundaryId: insertTask.boundaryId || null,
      featureId: insertTask.featureId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.tasks.set(id, task);
    this.saveTasks();
    return task;
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async updateTaskStatus(id: number, status: string, userId: number): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }
    task.status = status as any;
    task.updatedAt = new Date();
    this.tasks.set(id, task);
    this.saveTasks();
    return task;
  }

  async assignTask(id: number, assignedTo: number): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }
    task.assignedTo = assignedTo;
    task.status = 'Assigned';
    task.updatedAt = new Date();
    this.tasks.set(id, task);
    this.saveTasks();
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

  // Feature operations
  async createFeature(insertFeature: InsertFeature): Promise<Feature> {
    const id = this.featureCurrentId++;
    const feature: Feature = {
      id,
      name: insertFeature.name,
      feaNo: insertFeature.feaNo,
      feaState: insertFeature.feaState,
      feaStatus: insertFeature.feaStatus,
      feaType: insertFeature.feaType,
      specificType: insertFeature.specificType,
      maintenance: insertFeature.maintenance || 'None',
      maintenanceDate: insertFeature.maintenanceDate || null,
      geometry: insertFeature.geometry,
      remarks: insertFeature.remarks || null,
      createdBy: insertFeature.createdBy || null,
      boundaryId: insertFeature.boundaryId || null,
      createdAt: new Date(),
      lastUpdated: new Date()
    };
    this.features.set(id, feature);
    this.saveFeatures();
    return feature;
  }

  async getFeature(id: number): Promise<Feature | undefined> {
    return this.features.get(id);
  }

  async updateFeature(id: number, featureUpdate: Partial<Feature>): Promise<Feature> {
    const feature = this.features.get(id);
    if (!feature) {
      throw new Error(`Feature with id ${id} not found`);
    }
    const updatedFeature = { ...feature, ...featureUpdate, lastUpdated: new Date() };
    this.features.set(id, updatedFeature);
    this.saveFeatures();
    return updatedFeature;
  }

  async deleteFeature(id: number): Promise<boolean> {
    const result = this.features.delete(id);
    this.saveFeatures();
    return result;
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

  // Boundary operations
  async createBoundary(insertBoundary: InsertBoundary): Promise<Boundary> {
    const id = this.boundaryCurrentId++;
    const boundary: Boundary = {
      id,
      name: insertBoundary.name,
      description: insertBoundary.description || null,
      status: insertBoundary.status || 'New',
      assignedTo: insertBoundary.assignedTo || null,
      geometry: insertBoundary.geometry,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.boundaries.set(id, boundary);
    this.saveBoundaries();
    return boundary;
  }

  async getBoundary(id: number): Promise<Boundary | undefined> {
    return this.boundaries.get(id);
  }

  async updateBoundaryStatus(id: number, status: string): Promise<Boundary> {
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

  async assignBoundary(id: number, userId: number): Promise<Boundary> {
    const boundary = this.boundaries.get(id);
    if (!boundary) {
      throw new Error(`Boundary with id ${id} not found`);
    }
    boundary.assignedTo = userId;
    boundary.updatedAt = new Date();
    this.boundaries.set(id, boundary);
    this.saveBoundaries();
    return boundary;
  }

  async getAllBoundaries(): Promise<Boundary[]> {
    return Array.from(this.boundaries.values());
  }

  // Task updates operations
  async createTaskUpdate(insertUpdate: InsertTaskUpdate): Promise<TaskUpdate> {
    const id = this.taskUpdateCurrentId++;
    const update: TaskUpdate = {
      id,
      taskId: insertUpdate.taskId,
      userId: insertUpdate.userId,
      comment: insertUpdate.comment || null,
      oldStatus: insertUpdate.oldStatus || null,
      newStatus: insertUpdate.newStatus || null,
      createdAt: new Date()
    };
    this.taskUpdates.set(id, update);
    this.saveTaskUpdates();
    return update;
  }

  async getTaskUpdates(taskId: number): Promise<TaskUpdate[]> {
    return Array.from(this.taskUpdates.values()).filter(
      (update) => update.taskId === taskId
    );
  }

  // Task evidence operations
  async addTaskEvidence(insertEvidence: InsertTaskEvidence): Promise<TaskEvidence> {
    const id = this.taskEvidenceCurrentId++;
    const evidence: TaskEvidence = {
      id,
      taskId: insertEvidence.taskId,
      userId: insertEvidence.userId,
      imageUrl: insertEvidence.imageUrl,
      description: insertEvidence.description || null,
      createdAt: new Date()
    };
    this.taskEvidence.set(id, evidence);
    this.saveTaskEvidence();
    return evidence;
  }

  async getTaskEvidence(taskId: number): Promise<TaskEvidence[]> {
    return Array.from(this.taskEvidence.values()).filter(
      (evidence) => evidence.taskId === taskId
    );
  }
}
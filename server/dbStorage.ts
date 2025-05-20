import { db } from './db';
import { 
  users, teams, tasks, features, boundaries, taskUpdates, taskEvidence,
  User, InsertUser, 
  Task, InsertTask, 
  Feature, InsertFeature, 
  Boundary, InsertBoundary,
  TaskUpdate, InsertTaskUpdate,
  TaskEvidence, InsertTaskEvidence,
  Team, InsertTeam
} from '@shared/schema';
import { IStorage } from './storage';
import { eq, and, isNull, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export class PostgresStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    const result = await db.insert(users).values({
      ...user,
      password: hashedPassword,
      createdAt: new Date(),
      lastActive: null,
      currentLocation: null
    }).returning();
    
    return result[0];
  }

  async updateUserLocation(id: number, location: { lat: number, lng: number }): Promise<User> {
    const result = await db.update(users)
      .set({ currentLocation: JSON.stringify(location) })
      .where(eq(users.id, id))
      .returning();
    
    return result[0];
  }

  async updateUserLastActive(id: number): Promise<User> {
    const result = await db.update(users)
      .set({ lastActive: new Date() })
      .where(eq(users.id, id))
      .returning();
    
    return result[0];
  }

  async getAllFieldUsers(): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, 'Field'));
  }

  // Task operations
  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values({
      ...task,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return result[0];
  }

  async getTask(id: number): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id));
    return result[0];
  }

  async updateTaskStatus(id: number, status: string, userId: number): Promise<Task> {
    const result = await db.update(tasks)
      .set({ 
        status: status as any, 
        updatedAt: new Date() 
      })
      .where(eq(tasks.id, id))
      .returning();
    
    // Create a task update record
    const task = result[0];
    await this.createTaskUpdate({
      taskId: id,
      userId: userId,
      oldStatus: task.status,
      newStatus: status as any,
      comment: `Status updated to ${status}`
    });
    
    return task;
  }

  async assignTask(id: number, assignedTo: number): Promise<Task> {
    const result = await db.update(tasks)
      .set({ 
        assignedTo, 
        status: 'Assigned',
        updatedAt: new Date() 
      })
      .where(eq(tasks.id, id))
      .returning();
    
    return result[0];
  }

  async getTasksByAssignee(userId: number): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.assignedTo, userId));
  }

  async getTasksByCreator(userId: number): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.createdBy, userId));
  }

  async getAllTasks(): Promise<Task[]> {
    return db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  // Feature operations
  async createFeature(feature: InsertFeature): Promise<Feature> {
    const result = await db.insert(features).values({
      ...feature,
      createdAt: new Date(),
      lastUpdated: new Date()
    }).returning();
    
    return result[0];
  }

  async getFeature(id: number): Promise<Feature | undefined> {
    const result = await db.select().from(features).where(eq(features.id, id));
    return result[0];
  }

  async updateFeature(id: number, featureUpdate: Partial<Feature>): Promise<Feature> {
    const result = await db.update(features)
      .set({ 
        ...featureUpdate,
        lastUpdated: new Date() 
      })
      .where(eq(features.id, id))
      .returning();
    
    return result[0];
  }

  async deleteFeature(id: number): Promise<boolean> {
    const result = await db.delete(features).where(eq(features.id, id)).returning();
    return result.length > 0;
  }

  async getFeaturesByType(type: string): Promise<Feature[]> {
    return db.select().from(features).where(eq(features.feaType, type as any));
  }

  async getFeaturesByStatus(status: string): Promise<Feature[]> {
    return db.select().from(features).where(eq(features.feaStatus, status as any));
  }

  async getAllFeatures(): Promise<Feature[]> {
    return db.select().from(features);
  }

  // Boundary operations
  async createBoundary(boundary: InsertBoundary): Promise<Boundary> {
    const result = await db.insert(boundaries).values({
      ...boundary,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return result[0];
  }

  async getBoundary(id: number): Promise<Boundary | undefined> {
    const result = await db.select().from(boundaries).where(eq(boundaries.id, id));
    return result[0];
  }

  async updateBoundaryStatus(id: number, status: string): Promise<Boundary> {
    const result = await db.update(boundaries)
      .set({ 
        status: status as any, 
        updatedAt: new Date() 
      })
      .where(eq(boundaries.id, id))
      .returning();
    
    return result[0];
  }

  async assignBoundary(id: number, userId: number): Promise<Boundary> {
    const result = await db.update(boundaries)
      .set({ 
        assignedTo: userId, 
        updatedAt: new Date() 
      })
      .where(eq(boundaries.id, id))
      .returning();
    
    return result[0];
  }

  async getAllBoundaries(): Promise<Boundary[]> {
    return db.select().from(boundaries);
  }

  // Task updates operations
  async createTaskUpdate(update: InsertTaskUpdate): Promise<TaskUpdate> {
    const result = await db.insert(taskUpdates).values({
      ...update,
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }

  async getTaskUpdates(taskId: number): Promise<TaskUpdate[]> {
    return db.select()
      .from(taskUpdates)
      .where(eq(taskUpdates.taskId, taskId))
      .orderBy(desc(taskUpdates.createdAt));
  }

  // Task evidence operations
  async addTaskEvidence(evidence: InsertTaskEvidence): Promise<TaskEvidence> {
    const result = await db.insert(taskEvidence).values({
      ...evidence,
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }

  async getTaskEvidence(taskId: number): Promise<TaskEvidence[]> {
    return db.select()
      .from(taskEvidence)
      .where(eq(taskEvidence.taskId, taskId))
      .orderBy(desc(taskEvidence.createdAt));
  }

  // Team operations
  async createTeam(team: InsertTeam): Promise<Team> {
    const result = await db.insert(teams).values({
      ...team,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return result[0];
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const result = await db.select().from(teams).where(eq(teams.id, id));
    return result[0];
  }

  async getTeamByName(name: string): Promise<Team | undefined> {
    const result = await db.select().from(teams).where(eq(teams.name, name));
    return result[0];
  }

  async updateTeamStatus(id: number, status: string, approvedBy?: number): Promise<Team> {
    const update: any = { 
      status: status as any, 
      updatedAt: new Date() 
    };
    
    if (approvedBy) {
      update.approvedBy = approvedBy;
    }
    
    const result = await db.update(teams)
      .set(update)
      .where(eq(teams.id, id))
      .returning();
    
    return result[0];
  }

  async getAllTeams(): Promise<Team[]> {
    return db.select().from(teams);
  }

  async getUsersByTeam(teamId: number): Promise<User[]> {
    return db.select().from(users).where(eq(users.teamId, teamId));
  }

  async assignUserToTeam(userId: number, teamId: number): Promise<User> {
    const result = await db.update(users)
      .set({ teamId })
      .where(eq(users.id, userId))
      .returning();
    
    return result[0];
  }
}
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
import { 
  User as UserModel, 
  Team as TeamModel, 
  Task as TaskModel, 
  Feature as FeatureModel,
  Boundary as BoundaryModel,
  TaskUpdate as TaskUpdateModel,
  TaskEvidence as TaskEvidenceModel,
  connectToMongoDB
} from './mongoDb';

/**
 * MongoDB implementation of the IStorage interface
 */
export class MongoStorage implements IStorage {
  constructor() {
    // Ensure MongoDB connection is established
    this.initialize();
  }

  private async initialize() {
    await connectToMongoDB();
    
    // Check if supervisor exists, if not create one
    const supervisorExists = await UserModel.findOne({ username: 'supervisor12' });
    if (!supervisorExists) {
      console.log('Creating default supervisor account...');
      const supervisor = new UserModel({
        id: 1,
        username: 'supervisor12',
        password: 'supervisor@12',
        name: 'Supervisor',
        email: 'supervisor@geowhats.com',
        role: 'Supervisor',
        teamId: null,
        lastActive: null,
        currentLocation: null,
        createdAt: new Date()
      });
      await supervisor.save();
      console.log('Default supervisor account created.');
      
      // Create some sample teams for users to select from
      await this.createInitialTeams();
    }
  }
  
  // Create initial teams for the application
  private async createInitialTeams() {
    try {
      const teamsExist = await TeamModel.findOne();
      if (!teamsExist) {
        console.log('Creating initial teams...');
        
        const teams = [
          {
            id: 1,
            name: 'Field Team Alpha',
            description: 'Primary field operations team',
            status: 'Approved',
            createdAt: new Date(),
            updatedAt: new Date(),
            approvedBy: 1
          },
          {
            id: 2,
            name: 'Field Team Beta',
            description: 'Secondary field operations team',
            status: 'Approved',
            createdAt: new Date(),
            updatedAt: new Date(),
            approvedBy: 1
          },
          {
            id: 3,
            name: 'Maintenance Team',
            description: 'Team responsible for infrastructure maintenance',
            status: 'Approved',
            createdAt: new Date(),
            updatedAt: new Date(),
            approvedBy: 1
          }
        ];
        
        for (const team of teams) {
          await new TeamModel(team).save();
        }
        
        console.log('Initial teams created successfully');
      }
    } catch (error) {
      console.error('Error creating initial teams:', error);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({ id });
      if (!user) return undefined;
      
      return {
        id: user.id,
        username: user.username,
        password: user.password,
        name: user.name,
        email: user.email,
        role: user.role as "Supervisor" | "Field",
        teamId: user.teamId,
        lastActive: user.lastActive,
        currentLocation: user.currentLocation,
        createdAt: user.createdAt
      };
    } catch (error) {
      console.error('MongoDB getUser error:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({ username });
      if (!user) return undefined;
      
      return {
        id: user.id,
        username: user.username,
        password: user.password,
        name: user.name,
        email: user.email,
        role: user.role as "Supervisor" | "Field",
        teamId: user.teamId,
        lastActive: user.lastActive,
        currentLocation: user.currentLocation,
        createdAt: user.createdAt
      };
    } catch (error) {
      console.error('MongoDB getUserByUsername error:', error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      // Find the highest id and increment by 1
      const maxIdUser = await UserModel.findOne().sort({ id: -1 });
      const nextId = maxIdUser ? maxIdUser.id + 1 : 1;
      
      const newUser = new UserModel({
        id: nextId,
        username: user.username,
        password: user.password,
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.teamId || null,
        lastActive: null,
        currentLocation: null,
        createdAt: new Date()
      });
      
      await newUser.save();
      
      return {
        id: newUser.id,
        username: newUser.username,
        password: newUser.password,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role as "Supervisor" | "Field",
        teamId: newUser.teamId,
        lastActive: newUser.lastActive,
        currentLocation: newUser.currentLocation,
        createdAt: newUser.createdAt
      };
    } catch (error) {
      console.error('MongoDB createUser error:', error);
      throw error;
    }
  }

  async updateUserLocation(id: number, location: { lat: number, lng: number }): Promise<User> {
    try {
      const user = await UserModel.findOneAndUpdate(
        { id },
        { 
          currentLocation: location,
          lastActive: new Date()
        },
        { new: true }
      );
      
      if (!user) {
        throw new Error(`User with id ${id} not found`);
      }
      
      return {
        id: user.id,
        username: user.username,
        password: user.password,
        name: user.name,
        email: user.email,
        role: user.role as "Supervisor" | "Field",
        teamId: user.teamId,
        lastActive: user.lastActive,
        currentLocation: user.currentLocation,
        createdAt: user.createdAt
      };
    } catch (error) {
      console.error('MongoDB updateUserLocation error:', error);
      throw error;
    }
  }

  async updateUserLastActive(id: number): Promise<User> {
    try {
      const user = await UserModel.findOneAndUpdate(
        { id },
        { lastActive: new Date() },
        { new: true }
      );
      
      if (!user) {
        throw new Error(`User with id ${id} not found`);
      }
      
      return {
        id: user.id,
        username: user.username,
        password: user.password,
        name: user.name,
        email: user.email,
        role: user.role as "Supervisor" | "Field",
        teamId: user.teamId,
        lastActive: user.lastActive,
        currentLocation: user.currentLocation,
        createdAt: user.createdAt
      };
    } catch (error) {
      console.error('MongoDB updateUserLastActive error:', error);
      throw error;
    }
  }

  async getAllFieldUsers(): Promise<User[]> {
    try {
      const users = await UserModel.find({ role: 'Field' });
      
      return users.map(user => ({
        id: user.id,
        username: user.username,
        password: user.password,
        name: user.name,
        email: user.email,
        role: user.role as "Supervisor" | "Field",
        teamId: user.teamId,
        lastActive: user.lastActive,
        currentLocation: user.currentLocation,
        createdAt: user.createdAt
      }));
    } catch (error) {
      console.error('MongoDB getAllFieldUsers error:', error);
      return [];
    }
  }

  // Team operations
  async createTeam(team: InsertTeam): Promise<Team> {
    try {
      // Find the highest id and increment by 1
      const maxIdTeam = await TeamModel.findOne().sort({ id: -1 });
      const nextId = maxIdTeam ? maxIdTeam.id + 1 : 1;
      
      const newTeam = new TeamModel({
        id: nextId,
        name: team.name,
        description: team.description || null,
        status: team.status || 'Pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        approvedBy: null
      });
      
      await newTeam.save();
      
      return {
        id: newTeam.id,
        name: newTeam.name,
        description: newTeam.description,
        status: newTeam.status as "Pending" | "Approved" | "Rejected",
        createdAt: newTeam.createdAt,
        updatedAt: newTeam.updatedAt,
        approvedBy: newTeam.approvedBy
      };
    } catch (error) {
      console.error('MongoDB createTeam error:', error);
      throw error;
    }
  }

  async getTeam(id: number): Promise<Team | undefined> {
    try {
      const team = await TeamModel.findOne({ id });
      if (!team) return undefined;
      
      return {
        id: team.id,
        name: team.name,
        description: team.description,
        status: team.status as "Pending" | "Approved" | "Rejected",
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        approvedBy: team.approvedBy
      };
    } catch (error) {
      console.error('MongoDB getTeam error:', error);
      return undefined;
    }
  }

  async getTeamByName(name: string): Promise<Team | undefined> {
    try {
      const team = await TeamModel.findOne({ name });
      if (!team) return undefined;
      
      return {
        id: team.id,
        name: team.name,
        description: team.description,
        status: team.status as "Pending" | "Approved" | "Rejected",
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        approvedBy: team.approvedBy
      };
    } catch (error) {
      console.error('MongoDB getTeamByName error:', error);
      return undefined;
    }
  }

  async updateTeamStatus(id: number, status: string, approvedBy?: number): Promise<Team> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date()
      };
      
      if (approvedBy) {
        updateData.approvedBy = approvedBy;
      }
      
      const team = await TeamModel.findOneAndUpdate(
        { id },
        updateData,
        { new: true }
      );
      
      if (!team) {
        throw new Error(`Team with id ${id} not found`);
      }
      
      return {
        id: team.id,
        name: team.name,
        description: team.description,
        status: team.status as "Pending" | "Approved" | "Rejected",
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        approvedBy: team.approvedBy
      };
    } catch (error) {
      console.error('MongoDB updateTeamStatus error:', error);
      throw error;
    }
  }

  async getAllTeams(): Promise<Team[]> {
    try {
      const teams = await TeamModel.find();
      
      return teams.map(team => ({
        id: team.id,
        name: team.name,
        description: team.description,
        status: team.status as "Pending" | "Approved" | "Rejected",
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        approvedBy: team.approvedBy
      }));
    } catch (error) {
      console.error('MongoDB getAllTeams error:', error);
      return [];
    }
  }

  async getUsersByTeam(teamId: number): Promise<User[]> {
    try {
      const users = await UserModel.find({ teamId });
      
      return users.map(user => ({
        id: user.id,
        username: user.username,
        password: user.password,
        name: user.name,
        email: user.email,
        role: user.role as "Supervisor" | "Field",
        teamId: user.teamId,
        lastActive: user.lastActive,
        currentLocation: user.currentLocation,
        createdAt: user.createdAt
      }));
    } catch (error) {
      console.error('MongoDB getUsersByTeam error:', error);
      return [];
    }
  }

  async assignUserToTeam(userId: number, teamId: number): Promise<User> {
    try {
      const user = await UserModel.findOneAndUpdate(
        { id: userId },
        { teamId },
        { new: true }
      );
      
      if (!user) {
        throw new Error(`User with id ${userId} not found`);
      }
      
      return {
        id: user.id,
        username: user.username,
        password: user.password,
        name: user.name,
        email: user.email,
        role: user.role as "Supervisor" | "Field",
        teamId: user.teamId,
        lastActive: user.lastActive,
        currentLocation: user.currentLocation,
        createdAt: user.createdAt
      };
    } catch (error) {
      console.error('MongoDB assignUserToTeam error:', error);
      throw error;
    }
  }

  // Task operations - implementing just the required methods for now
  async createTask(insertTask: InsertTask): Promise<Task> {
    try {
      // Find the highest id and increment by 1
      const maxIdTask = await TaskModel.findOne().sort({ id: -1 });
      const nextId = maxIdTask ? maxIdTask.id + 1 : 1;
      
      const newTask = new TaskModel({
        id: nextId,
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
      });
      
      await newTask.save();
      
      return {
        id: newTask.id,
        title: newTask.title,
        description: newTask.description,
        status: newTask.status as any,
        priority: newTask.priority as "Low" | "Medium" | "High" | "Urgent",
        createdBy: newTask.createdBy,
        assignedTo: newTask.assignedTo,
        dueDate: newTask.dueDate,
        location: newTask.location,
        boundaryId: newTask.boundaryId,
        featureId: newTask.featureId,
        createdAt: newTask.createdAt,
        updatedAt: newTask.updatedAt
      };
    } catch (error) {
      console.error('MongoDB createTask error:', error);
      throw error;
    }
  }

  async getTask(id: number): Promise<Task | undefined> {
    try {
      const task = await TaskModel.findOne({ id });
      if (!task) return undefined;
      
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status as any,
        priority: task.priority as "Low" | "Medium" | "High" | "Urgent",
        createdBy: task.createdBy,
        assignedTo: task.assignedTo,
        dueDate: task.dueDate,
        location: task.location,
        boundaryId: task.boundaryId,
        featureId: task.featureId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      };
    } catch (error) {
      console.error('MongoDB getTask error:', error);
      return undefined;
    }
  }

  async updateTaskStatus(id: number, status: string, userId: number): Promise<Task> {
    try {
      const task = await TaskModel.findOneAndUpdate(
        { id },
        {
          status,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!task) {
        throw new Error(`Task with id ${id} not found`);
      }
      
      // Create a task update record
      const taskUpdate = new TaskUpdateModel({
        id: await this.getNextTaskUpdateId(),
        taskId: task.id,
        userId,
        comment: null,
        oldStatus: null, // We don't track the old status in this implementation
        newStatus: status,
        createdAt: new Date()
      });
      
      await taskUpdate.save();
      
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status as any,
        priority: task.priority as "Low" | "Medium" | "High" | "Urgent",
        createdBy: task.createdBy,
        assignedTo: task.assignedTo,
        dueDate: task.dueDate,
        location: task.location,
        boundaryId: task.boundaryId,
        featureId: task.featureId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      };
    } catch (error) {
      console.error('MongoDB updateTaskStatus error:', error);
      throw error;
    }
  }

  async assignTask(id: number, assignedTo: number): Promise<Task> {
    try {
      const task = await TaskModel.findOneAndUpdate(
        { id },
        {
          assignedTo,
          status: 'Assigned',
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!task) {
        throw new Error(`Task with id ${id} not found`);
      }
      
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status as any,
        priority: task.priority as "Low" | "Medium" | "High" | "Urgent",
        createdBy: task.createdBy,
        assignedTo: task.assignedTo,
        dueDate: task.dueDate,
        location: task.location,
        boundaryId: task.boundaryId,
        featureId: task.featureId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      };
    } catch (error) {
      console.error('MongoDB assignTask error:', error);
      throw error;
    }
  }

  async getTasksByAssignee(userId: number): Promise<Task[]> {
    try {
      const tasks = await TaskModel.find({ assignedTo: userId });
      
      return tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status as any,
        priority: task.priority as "Low" | "Medium" | "High" | "Urgent",
        createdBy: task.createdBy,
        assignedTo: task.assignedTo,
        dueDate: task.dueDate,
        location: task.location,
        boundaryId: task.boundaryId,
        featureId: task.featureId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }));
    } catch (error) {
      console.error('MongoDB getTasksByAssignee error:', error);
      return [];
    }
  }

  async getTasksByCreator(userId: number): Promise<Task[]> {
    try {
      const tasks = await TaskModel.find({ createdBy: userId });
      
      return tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status as any,
        priority: task.priority as "Low" | "Medium" | "High" | "Urgent",
        createdBy: task.createdBy,
        assignedTo: task.assignedTo,
        dueDate: task.dueDate,
        location: task.location,
        boundaryId: task.boundaryId,
        featureId: task.featureId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }));
    } catch (error) {
      console.error('MongoDB getTasksByCreator error:', error);
      return [];
    }
  }

  async getAllTasks(): Promise<Task[]> {
    try {
      const tasks = await TaskModel.find();
      
      return tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status as any,
        priority: task.priority as "Low" | "Medium" | "High" | "Urgent",
        createdBy: task.createdBy,
        assignedTo: task.assignedTo,
        dueDate: task.dueDate,
        location: task.location,
        boundaryId: task.boundaryId,
        featureId: task.featureId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }));
    } catch (error) {
      console.error('MongoDB getAllTasks error:', error);
      return [];
    }
  }

  // Feature operations
  async createFeature(insertFeature: InsertFeature): Promise<Feature> {
    try {
      // Find the highest id and increment by 1
      const maxIdFeature = await FeatureModel.findOne().sort({ id: -1 });
      const nextId = maxIdFeature ? maxIdFeature.id + 1 : 1;
      
      const newFeature = new FeatureModel({
        id: nextId,
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
      });
      
      await newFeature.save();
      
      return {
        id: newFeature.id,
        name: newFeature.name,
        feaNo: newFeature.feaNo,
        feaState: newFeature.feaState as any,
        feaStatus: newFeature.feaStatus as any,
        feaType: newFeature.feaType as any,
        specificType: newFeature.specificType as any,
        maintenance: newFeature.maintenance as "Required" | "None",
        maintenanceDate: newFeature.maintenanceDate,
        geometry: newFeature.geometry,
        remarks: newFeature.remarks,
        createdBy: newFeature.createdBy,
        boundaryId: newFeature.boundaryId,
        createdAt: newFeature.createdAt,
        lastUpdated: newFeature.lastUpdated
      };
    } catch (error) {
      console.error('MongoDB createFeature error:', error);
      throw error;
    }
  }

  async getFeature(id: number): Promise<Feature | undefined> {
    try {
      const feature = await FeatureModel.findOne({ id });
      if (!feature) return undefined;
      
      return {
        id: feature.id,
        name: feature.name,
        feaNo: feature.feaNo,
        feaState: feature.feaState as any,
        feaStatus: feature.feaStatus as any,
        feaType: feature.feaType as any,
        specificType: feature.specificType as any,
        maintenance: feature.maintenance as "Required" | "None",
        maintenanceDate: feature.maintenanceDate,
        geometry: feature.geometry,
        remarks: feature.remarks,
        createdBy: feature.createdBy,
        boundaryId: feature.boundaryId,
        createdAt: feature.createdAt,
        lastUpdated: feature.lastUpdated
      };
    } catch (error) {
      console.error('MongoDB getFeature error:', error);
      return undefined;
    }
  }

  async updateFeature(id: number, featureUpdate: Partial<Feature>): Promise<Feature> {
    try {
      const updateData = {
        ...featureUpdate,
        lastUpdated: new Date()
      };
      
      const feature = await FeatureModel.findOneAndUpdate(
        { id },
        updateData,
        { new: true }
      );
      
      if (!feature) {
        throw new Error(`Feature with id ${id} not found`);
      }
      
      return {
        id: feature.id,
        name: feature.name,
        feaNo: feature.feaNo,
        feaState: feature.feaState as any,
        feaStatus: feature.feaStatus as any,
        feaType: feature.feaType as any,
        specificType: feature.specificType as any,
        maintenance: feature.maintenance as "Required" | "None",
        maintenanceDate: feature.maintenanceDate,
        geometry: feature.geometry,
        remarks: feature.remarks,
        createdBy: feature.createdBy,
        boundaryId: feature.boundaryId,
        createdAt: feature.createdAt,
        lastUpdated: feature.lastUpdated
      };
    } catch (error) {
      console.error('MongoDB updateFeature error:', error);
      throw error;
    }
  }

  async deleteFeature(id: number): Promise<boolean> {
    try {
      const result = await FeatureModel.deleteOne({ id });
      return result.deletedCount === 1;
    } catch (error) {
      console.error('MongoDB deleteFeature error:', error);
      return false;
    }
  }

  async getFeaturesByType(type: string): Promise<Feature[]> {
    try {
      const features = await FeatureModel.find({ feaType: type });
      
      return features.map(feature => ({
        id: feature.id,
        name: feature.name,
        feaNo: feature.feaNo,
        feaState: feature.feaState as any,
        feaStatus: feature.feaStatus as any,
        feaType: feature.feaType as any,
        specificType: feature.specificType as any,
        maintenance: feature.maintenance as "Required" | "None",
        maintenanceDate: feature.maintenanceDate,
        geometry: feature.geometry,
        remarks: feature.remarks,
        createdBy: feature.createdBy,
        boundaryId: feature.boundaryId,
        createdAt: feature.createdAt,
        lastUpdated: feature.lastUpdated
      }));
    } catch (error) {
      console.error('MongoDB getFeaturesByType error:', error);
      return [];
    }
  }

  async getFeaturesByStatus(status: string): Promise<Feature[]> {
    try {
      const features = await FeatureModel.find({ feaStatus: status });
      
      return features.map(feature => ({
        id: feature.id,
        name: feature.name,
        feaNo: feature.feaNo,
        feaState: feature.feaState as any,
        feaStatus: feature.feaStatus as any,
        feaType: feature.feaType as any,
        specificType: feature.specificType as any,
        maintenance: feature.maintenance as "Required" | "None",
        maintenanceDate: feature.maintenanceDate,
        geometry: feature.geometry,
        remarks: feature.remarks,
        createdBy: feature.createdBy,
        boundaryId: feature.boundaryId,
        createdAt: feature.createdAt,
        lastUpdated: feature.lastUpdated
      }));
    } catch (error) {
      console.error('MongoDB getFeaturesByStatus error:', error);
      return [];
    }
  }

  async getAllFeatures(): Promise<Feature[]> {
    try {
      const features = await FeatureModel.find();
      
      return features.map(feature => ({
        id: feature.id,
        name: feature.name,
        feaNo: feature.feaNo,
        feaState: feature.feaState as any,
        feaStatus: feature.feaStatus as any,
        feaType: feature.feaType as any,
        specificType: feature.specificType as any,
        maintenance: feature.maintenance as "Required" | "None",
        maintenanceDate: feature.maintenanceDate,
        geometry: feature.geometry,
        remarks: feature.remarks,
        createdBy: feature.createdBy,
        boundaryId: feature.boundaryId,
        createdAt: feature.createdAt,
        lastUpdated: feature.lastUpdated
      }));
    } catch (error) {
      console.error('MongoDB getAllFeatures error:', error);
      return [];
    }
  }

  // Boundary operations
  async createBoundary(insertBoundary: InsertBoundary): Promise<Boundary> {
    try {
      // Find the highest id and increment by 1
      const maxIdBoundary = await BoundaryModel.findOne().sort({ id: -1 });
      const nextId = maxIdBoundary ? maxIdBoundary.id + 1 : 1;
      
      const newBoundary = new BoundaryModel({
        id: nextId,
        name: insertBoundary.name,
        description: insertBoundary.description || null,
        status: insertBoundary.status || 'New',
        assignedTo: insertBoundary.assignedTo || null,
        geometry: insertBoundary.geometry,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newBoundary.save();
      
      return {
        id: newBoundary.id,
        name: newBoundary.name,
        description: newBoundary.description,
        status: newBoundary.status as any,
        assignedTo: newBoundary.assignedTo,
        geometry: newBoundary.geometry,
        createdAt: newBoundary.createdAt,
        updatedAt: newBoundary.updatedAt
      };
    } catch (error) {
      console.error('MongoDB createBoundary error:', error);
      throw error;
    }
  }

  async getBoundary(id: number): Promise<Boundary | undefined> {
    try {
      const boundary = await BoundaryModel.findOne({ id });
      if (!boundary) return undefined;
      
      return {
        id: boundary.id,
        name: boundary.name,
        description: boundary.description,
        status: boundary.status as any,
        assignedTo: boundary.assignedTo,
        geometry: boundary.geometry,
        createdAt: boundary.createdAt,
        updatedAt: boundary.updatedAt
      };
    } catch (error) {
      console.error('MongoDB getBoundary error:', error);
      return undefined;
    }
  }

  async updateBoundaryStatus(id: number, status: string): Promise<Boundary> {
    try {
      const boundary = await BoundaryModel.findOneAndUpdate(
        { id },
        {
          status,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!boundary) {
        throw new Error(`Boundary with id ${id} not found`);
      }
      
      return {
        id: boundary.id,
        name: boundary.name,
        description: boundary.description,
        status: boundary.status as any,
        assignedTo: boundary.assignedTo,
        geometry: boundary.geometry,
        createdAt: boundary.createdAt,
        updatedAt: boundary.updatedAt
      };
    } catch (error) {
      console.error('MongoDB updateBoundaryStatus error:', error);
      throw error;
    }
  }

  async assignBoundary(id: number, userId: number): Promise<Boundary> {
    try {
      const boundary = await BoundaryModel.findOneAndUpdate(
        { id },
        {
          assignedTo: userId,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!boundary) {
        throw new Error(`Boundary with id ${id} not found`);
      }
      
      return {
        id: boundary.id,
        name: boundary.name,
        description: boundary.description,
        status: boundary.status as any,
        assignedTo: boundary.assignedTo,
        geometry: boundary.geometry,
        createdAt: boundary.createdAt,
        updatedAt: boundary.updatedAt
      };
    } catch (error) {
      console.error('MongoDB assignBoundary error:', error);
      throw error;
    }
  }

  async getAllBoundaries(): Promise<Boundary[]> {
    try {
      const boundaries = await BoundaryModel.find();
      
      return boundaries.map(boundary => ({
        id: boundary.id,
        name: boundary.name,
        description: boundary.description,
        status: boundary.status as any,
        assignedTo: boundary.assignedTo,
        geometry: boundary.geometry,
        createdAt: boundary.createdAt,
        updatedAt: boundary.updatedAt
      }));
    } catch (error) {
      console.error('MongoDB getAllBoundaries error:', error);
      return [];
    }
  }

  // Task updates operations
  private async getNextTaskUpdateId(): Promise<number> {
    const maxIdTaskUpdate = await TaskUpdateModel.findOne().sort({ id: -1 });
    return maxIdTaskUpdate ? maxIdTaskUpdate.id + 1 : 1;
  }
  
  async createTaskUpdate(insertUpdate: InsertTaskUpdate): Promise<TaskUpdate> {
    try {
      const nextId = await this.getNextTaskUpdateId();
      
      const newUpdate = new TaskUpdateModel({
        id: nextId,
        taskId: insertUpdate.taskId,
        userId: insertUpdate.userId,
        comment: insertUpdate.comment || null,
        oldStatus: insertUpdate.oldStatus || null,
        newStatus: insertUpdate.newStatus || null,
        createdAt: new Date()
      });
      
      await newUpdate.save();
      
      return {
        id: newUpdate.id,
        taskId: newUpdate.taskId,
        userId: newUpdate.userId,
        comment: newUpdate.comment,
        oldStatus: newUpdate.oldStatus as any,
        newStatus: newUpdate.newStatus as any,
        createdAt: newUpdate.createdAt
      };
    } catch (error) {
      console.error('MongoDB createTaskUpdate error:', error);
      throw error;
    }
  }

  async getTaskUpdates(taskId: number): Promise<TaskUpdate[]> {
    try {
      const updates = await TaskUpdateModel.find({ taskId });
      
      return updates.map(update => ({
        id: update.id,
        taskId: update.taskId,
        userId: update.userId,
        comment: update.comment,
        oldStatus: update.oldStatus as any,
        newStatus: update.newStatus as any,
        createdAt: update.createdAt
      }));
    } catch (error) {
      console.error('MongoDB getTaskUpdates error:', error);
      return [];
    }
  }

  // Task evidence operations
  private async getNextTaskEvidenceId(): Promise<number> {
    const maxIdTaskEvidence = await TaskEvidenceModel.findOne().sort({ id: -1 });
    return maxIdTaskEvidence ? maxIdTaskEvidence.id + 1 : 1;
  }
  
  async addTaskEvidence(insertEvidence: InsertTaskEvidence): Promise<TaskEvidence> {
    try {
      const nextId = await this.getNextTaskEvidenceId();
      
      const newEvidence = new TaskEvidenceModel({
        id: nextId,
        taskId: insertEvidence.taskId,
        userId: insertEvidence.userId,
        imageUrl: insertEvidence.imageUrl,
        description: insertEvidence.description || null,
        createdAt: new Date()
      });
      
      await newEvidence.save();
      
      return {
        id: newEvidence.id,
        taskId: newEvidence.taskId,
        userId: newEvidence.userId,
        imageUrl: newEvidence.imageUrl,
        description: newEvidence.description,
        createdAt: newEvidence.createdAt
      };
    } catch (error) {
      console.error('MongoDB addTaskEvidence error:', error);
      throw error;
    }
  }

  async getTaskEvidence(taskId: number): Promise<TaskEvidence[]> {
    try {
      const evidences = await TaskEvidenceModel.find({ taskId });
      
      return evidences.map(evidence => ({
        id: evidence.id,
        taskId: evidence.taskId,
        userId: evidence.userId,
        imageUrl: evidence.imageUrl,
        description: evidence.description,
        createdAt: evidence.createdAt
      }));
    } catch (error) {
      console.error('MongoDB getTaskEvidence error:', error);
      return [];
    }
  }
}
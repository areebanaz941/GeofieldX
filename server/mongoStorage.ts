import { IStorage } from './storage';
import { 
  User as UserType, InsertUser, 
  Task as TaskType, InsertTask,
  Feature as FeatureType, InsertFeature,
  Boundary as BoundaryType, InsertBoundary,
  TaskUpdate as TaskUpdateType, InsertTaskUpdate,
  TaskEvidence as TaskEvidenceType, InsertTaskEvidence,
  Team as TeamType, InsertTeam
} from '@shared/schema';
import { 
  User, Team, Task, Feature, Boundary, TaskUpdate, TaskEvidence 
} from './mongoDb';

export class MongoStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<UserType | undefined> {
    try {
      const user = await User.findOne({ id });
      if (!user) return undefined;
      
      return {
        id: user.id,
        username: user.username,
        password: user.password,
        name: user.name,
        email: user.email,
        role: user.role as "Supervisor" | "Field",
        teamId: user.teamId ? Number(user.teamId) : null,
        lastActive: user.lastActive,
        currentLocation: user.currentLocation,
        createdAt: user.createdAt
      };
    } catch (error) {
      console.error('MongoDB getUserById error:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<UserType | undefined> {
    try {
      const user = await User.findOne({ username });
      if (!user) return undefined;
      
      return {
        id: user.id,
        username: user.username,
        password: user.password,
        name: user.name,
        email: user.email,
        role: user.role as "Supervisor" | "Field",
        teamId: user.teamId ? Number(user.teamId) : null,
        lastActive: user.lastActive,
        currentLocation: user.currentLocation,
        createdAt: user.createdAt
      };
    } catch (error) {
      console.error('MongoDB getUserByUsername error:', error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<UserType> {
    try {
      // Find the highest id and increment by 1
      const maxIdUser = await User.findOne().sort({ id: -1 });
      const nextId = maxIdUser ? maxIdUser.id + 1 : 1;
      
      const newUser = new User({
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
        teamId: newUser.teamId ? Number(newUser.teamId) : null,
        lastActive: newUser.lastActive,
        currentLocation: newUser.currentLocation,
        createdAt: newUser.createdAt
      };
    } catch (error) {
      console.error('MongoDB createUser error:', error);
      throw error;
    }
  }

  async updateUserLocation(id: number, location: { lat: number, lng: number }): Promise<UserType> {
    try {
      const user = await User.findOneAndUpdate(
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
        teamId: user.teamId ? Number(user.teamId) : null,
        lastActive: user.lastActive,
        currentLocation: user.currentLocation,
        createdAt: user.createdAt
      };
    } catch (error) {
      console.error('MongoDB updateUserLocation error:', error);
      throw error;
    }
  }

  async updateUserLastActive(id: number): Promise<UserType> {
    try {
      const user = await User.findOneAndUpdate(
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
        teamId: user.teamId ? Number(user.teamId) : null,
        lastActive: user.lastActive,
        currentLocation: user.currentLocation,
        createdAt: user.createdAt
      };
    } catch (error) {
      console.error('MongoDB updateUserLastActive error:', error);
      throw error;
    }
  }

  async getAllFieldUsers(): Promise<UserType[]> {
    try {
      const users = await User.find({ role: 'Field' });
      
      return users.map(user => ({
        id: user.id,
        username: user.username,
        password: user.password,
        name: user.name,
        email: user.email,
        role: user.role as "Supervisor" | "Field",
        teamId: user.teamId ? Number(user.teamId) : null,
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
  async createTeam(team: InsertTeam): Promise<TeamType> {
    try {
      // Find the highest id and increment by 1
      const maxIdTeam = await Team.findOne().sort({ id: -1 });
      const nextId = maxIdTeam ? maxIdTeam.id + 1 : 1;
      
      const newTeam = new Team({
        id: nextId,
        name: team.name,
        description: team.description || '',
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
        approvedBy: newTeam.approvedBy ? Number(newTeam.approvedBy) : null
      };
    } catch (error) {
      console.error('MongoDB createTeam error:', error);
      throw error;
    }
  }

  async getTeam(id: number): Promise<TeamType | undefined> {
    try {
      const team = await Team.findOne({ id });
      if (!team) return undefined;
      
      return {
        id: team.id,
        name: team.name,
        description: team.description,
        status: team.status as "Pending" | "Approved" | "Rejected",
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        approvedBy: team.approvedBy ? Number(team.approvedBy) : null
      };
    } catch (error) {
      console.error('MongoDB getTeam error:', error);
      return undefined;
    }
  }

  async getTeamByName(name: string): Promise<TeamType | undefined> {
    try {
      const team = await Team.findOne({ name });
      if (!team) return undefined;
      
      return {
        id: team.id,
        name: team.name,
        description: team.description,
        status: team.status as "Pending" | "Approved" | "Rejected",
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        approvedBy: team.approvedBy ? Number(team.approvedBy) : null
      };
    } catch (error) {
      console.error('MongoDB getTeamByName error:', error);
      return undefined;
    }
  }

  async updateTeamStatus(id: number, status: string, approvedBy?: number): Promise<TeamType> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date()
      };
      
      if (approvedBy) {
        updateData.approvedBy = approvedBy;
      }
      
      const team = await Team.findOneAndUpdate(
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
        approvedBy: team.approvedBy ? Number(team.approvedBy) : null
      };
    } catch (error) {
      console.error('MongoDB updateTeamStatus error:', error);
      throw error;
    }
  }

  async getAllTeams(): Promise<TeamType[]> {
    try {
      const teams = await Team.find();
      
      return teams.map(team => ({
        id: team.id,
        name: team.name,
        description: team.description,
        status: team.status as "Pending" | "Approved" | "Rejected",
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        approvedBy: team.approvedBy ? Number(team.approvedBy) : null
      }));
    } catch (error) {
      console.error('MongoDB getAllTeams error:', error);
      return [];
    }
  }

  async getUsersByTeam(teamId: number): Promise<UserType[]> {
    try {
      const users = await User.find({ teamId });
      
      return users.map(user => ({
        id: user.id,
        username: user.username,
        password: user.password,
        name: user.name,
        email: user.email,
        role: user.role as "Supervisor" | "Field",
        teamId: user.teamId ? Number(user.teamId) : null,
        lastActive: user.lastActive,
        currentLocation: user.currentLocation,
        createdAt: user.createdAt
      }));
    } catch (error) {
      console.error('MongoDB getUsersByTeam error:', error);
      return [];
    }
  }

  async assignUserToTeam(userId: number, teamId: number): Promise<UserType> {
    try {
      const user = await User.findOneAndUpdate(
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
        teamId: user.teamId ? Number(user.teamId) : null,
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
  async createTask(task: InsertTask): Promise<TaskType> {
    try {
      // Find the highest id and increment by 1
      const maxIdTask = await Task.findOne().sort({ id: -1 });
      const nextId = maxIdTask ? maxIdTask.id + 1 : 1;
      
      const newTask = new Task({
        id: nextId,
        title: task.title,
        description: task.description || null,
        status: task.status || 'Unassigned',
        priority: task.priority,
        createdBy: task.createdBy || null,
        assignedTo: task.assignedTo || null,
        dueDate: task.dueDate || null,
        location: task.location || null,
        boundaryId: task.boundaryId || null,
        featureId: task.featureId || null,
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
        createdBy: newTask.createdBy ? Number(newTask.createdBy) : null,
        assignedTo: newTask.assignedTo ? Number(newTask.assignedTo) : null,
        dueDate: newTask.dueDate,
        location: newTask.location,
        boundaryId: newTask.boundaryId ? Number(newTask.boundaryId) : null,
        featureId: newTask.featureId ? Number(newTask.featureId) : null,
        createdAt: newTask.createdAt,
        updatedAt: newTask.updatedAt
      };
    } catch (error) {
      console.error('MongoDB createTask error:', error);
      throw error;
    }
  }

  async getTask(id: number): Promise<TaskType | undefined> {
    try {
      const task = await Task.findOne({ id });
      if (!task) return undefined;
      
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status as any,
        priority: task.priority as "Low" | "Medium" | "High" | "Urgent",
        createdBy: task.createdBy ? Number(task.createdBy) : null,
        assignedTo: task.assignedTo ? Number(task.assignedTo) : null,
        dueDate: task.dueDate,
        location: task.location,
        boundaryId: task.boundaryId ? Number(task.boundaryId) : null,
        featureId: task.featureId ? Number(task.featureId) : null,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      };
    } catch (error) {
      console.error('MongoDB getTask error:', error);
      return undefined;
    }
  }

  async updateTaskStatus(id: number, status: string, userId: number): Promise<TaskType> {
    try {
      const task = await Task.findOneAndUpdate(
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
      const taskUpdate = new TaskUpdate({
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
        createdBy: task.createdBy ? Number(task.createdBy) : null,
        assignedTo: task.assignedTo ? Number(task.assignedTo) : null,
        dueDate: task.dueDate,
        location: task.location,
        boundaryId: task.boundaryId ? Number(task.boundaryId) : null,
        featureId: task.featureId ? Number(task.featureId) : null,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      };
    } catch (error) {
      console.error('MongoDB updateTaskStatus error:', error);
      throw error;
    }
  }

  async assignTask(id: number, assignedTo: number): Promise<TaskType> {
    try {
      const task = await Task.findOneAndUpdate(
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
        createdBy: task.createdBy ? Number(task.createdBy) : null,
        assignedTo: task.assignedTo ? Number(task.assignedTo) : null,
        dueDate: task.dueDate,
        location: task.location,
        boundaryId: task.boundaryId ? Number(task.boundaryId) : null,
        featureId: task.featureId ? Number(task.featureId) : null,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      };
    } catch (error) {
      console.error('MongoDB assignTask error:', error);
      throw error;
    }
  }

  async getTasksByAssignee(userId: number): Promise<TaskType[]> {
    try {
      const tasks = await Task.find({ assignedTo: userId });
      
      return tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status as any,
        priority: task.priority as "Low" | "Medium" | "High" | "Urgent",
        createdBy: task.createdBy ? Number(task.createdBy) : null,
        assignedTo: task.assignedTo ? Number(task.assignedTo) : null,
        dueDate: task.dueDate,
        location: task.location,
        boundaryId: task.boundaryId ? Number(task.boundaryId) : null,
        featureId: task.featureId ? Number(task.featureId) : null,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }));
    } catch (error) {
      console.error('MongoDB getTasksByAssignee error:', error);
      return [];
    }
  }

  async getTasksByCreator(userId: number): Promise<TaskType[]> {
    try {
      const tasks = await Task.find({ createdBy: userId });
      
      return tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status as any,
        priority: task.priority as "Low" | "Medium" | "High" | "Urgent",
        createdBy: task.createdBy ? Number(task.createdBy) : null,
        assignedTo: task.assignedTo ? Number(task.assignedTo) : null,
        dueDate: task.dueDate,
        location: task.location,
        boundaryId: task.boundaryId ? Number(task.boundaryId) : null,
        featureId: task.featureId ? Number(task.featureId) : null,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }));
    } catch (error) {
      console.error('MongoDB getTasksByCreator error:', error);
      return [];
    }
  }

  async getAllTasks(): Promise<TaskType[]> {
    try {
      const tasks = await Task.find();
      
      return tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status as any,
        priority: task.priority as "Low" | "Medium" | "High" | "Urgent",
        createdBy: task.createdBy ? Number(task.createdBy) : null,
        assignedTo: task.assignedTo ? Number(task.assignedTo) : null,
        dueDate: task.dueDate,
        location: task.location,
        boundaryId: task.boundaryId ? Number(task.boundaryId) : null,
        featureId: task.featureId ? Number(task.featureId) : null,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }));
    } catch (error) {
      console.error('MongoDB getAllTasks error:', error);
      return [];
    }
  }

  // Task updates operations
  async createTaskUpdate(update: InsertTaskUpdate): Promise<TaskUpdateType> {
    try {
      // Find the highest id and increment by 1
      const maxIdUpdate = await TaskUpdate.findOne().sort({ id: -1 });
      const nextId = maxIdUpdate ? maxIdUpdate.id + 1 : 1;
      
      const newUpdate = new TaskUpdate({
        id: nextId,
        taskId: update.taskId,
        userId: update.userId,
        comment: update.comment || null,
        oldStatus: update.oldStatus || null,
        newStatus: update.newStatus || null,
        createdAt: new Date()
      });
      
      await newUpdate.save();
      
      return {
        id: newUpdate.id,
        taskId: Number(newUpdate.taskId),
        userId: Number(newUpdate.userId),
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

  async getTaskUpdates(taskId: number): Promise<TaskUpdateType[]> {
    try {
      const updates = await TaskUpdate.find({ taskId });
      
      return updates.map(update => ({
        id: update.id,
        taskId: Number(update.taskId),
        userId: Number(update.userId),
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
  async addTaskEvidence(evidence: InsertTaskEvidence): Promise<TaskEvidenceType> {
    try {
      // Find the highest id and increment by 1
      const maxIdEvidence = await TaskEvidence.findOne().sort({ id: -1 });
      const nextId = maxIdEvidence ? maxIdEvidence.id + 1 : 1;
      
      const newEvidence = new TaskEvidence({
        id: nextId,
        taskId: evidence.taskId,
        userId: evidence.userId,
        imageUrl: evidence.imageUrl,
        description: evidence.description || null,
        createdAt: new Date()
      });
      
      await newEvidence.save();
      
      return {
        id: newEvidence.id,
        taskId: Number(newEvidence.taskId),
        userId: Number(newEvidence.userId),
        imageUrl: newEvidence.imageUrl,
        description: newEvidence.description,
        createdAt: newEvidence.createdAt
      };
    } catch (error) {
      console.error('MongoDB addTaskEvidence error:', error);
      throw error;
    }
  }

  async getTaskEvidence(taskId: number): Promise<TaskEvidenceType[]> {
    try {
      const evidences = await TaskEvidence.find({ taskId });
      
      return evidences.map(evidence => ({
        id: evidence.id,
        taskId: Number(evidence.taskId),
        userId: Number(evidence.userId),
        imageUrl: evidence.imageUrl,
        description: evidence.description,
        createdAt: evidence.createdAt
      }));
    } catch (error) {
      console.error('MongoDB getTaskEvidence error:', error);
      return [];
    }
  }

  // Feature operations
  async createFeature(feature: InsertFeature): Promise<FeatureType> {
    try {
      // Find the highest id and increment by 1
      const maxIdFeature = await Feature.findOne().sort({ id: -1 });
      const nextId = maxIdFeature ? maxIdFeature.id + 1 : 1;
      
      const newFeature = new Feature({
        id: nextId,
        name: feature.name,
        feaNo: feature.feaNo,
        feaState: feature.feaState,
        feaStatus: feature.feaStatus,
        feaType: feature.feaType,
        specificType: feature.specificType,
        maintenance: feature.maintenance || 'None',
        createdBy: feature.createdBy || null,
        geometryData: feature.geometryData,
        info: feature.info || null,
        boundaryId: feature.boundaryId || null,
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
        createdBy: newFeature.createdBy ? Number(newFeature.createdBy) : null,
        geometryData: newFeature.geometryData,
        info: newFeature.info,
        boundaryId: newFeature.boundaryId ? Number(newFeature.boundaryId) : null,
        createdAt: newFeature.createdAt,
        lastUpdated: newFeature.lastUpdated
      };
    } catch (error) {
      console.error('MongoDB createFeature error:', error);
      throw error;
    }
  }

  async getFeature(id: number): Promise<FeatureType | undefined> {
    try {
      const feature = await Feature.findOne({ id });
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
        createdBy: feature.createdBy ? Number(feature.createdBy) : null,
        geometryData: feature.geometryData,
        info: feature.info,
        boundaryId: feature.boundaryId ? Number(feature.boundaryId) : null,
        createdAt: feature.createdAt,
        lastUpdated: feature.lastUpdated
      };
    } catch (error) {
      console.error('MongoDB getFeature error:', error);
      return undefined;
    }
  }

  async updateFeature(id: number, featureUpdate: Partial<FeatureType>): Promise<FeatureType> {
    try {
      const updateData: any = {
        ...featureUpdate,
        lastUpdated: new Date()
      };
      
      const feature = await Feature.findOneAndUpdate(
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
        createdBy: feature.createdBy ? Number(feature.createdBy) : null,
        geometryData: feature.geometryData,
        info: feature.info,
        boundaryId: feature.boundaryId ? Number(feature.boundaryId) : null,
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
      const result = await Feature.deleteOne({ id });
      return result.deletedCount === 1;
    } catch (error) {
      console.error('MongoDB deleteFeature error:', error);
      return false;
    }
  }

  async getFeaturesByType(type: string): Promise<FeatureType[]> {
    try {
      const features = await Feature.find({ feaType: type });
      
      return features.map(feature => ({
        id: feature.id,
        name: feature.name,
        feaNo: feature.feaNo,
        feaState: feature.feaState as any,
        feaStatus: feature.feaStatus as any,
        feaType: feature.feaType as any,
        specificType: feature.specificType as any,
        maintenance: feature.maintenance as "Required" | "None",
        createdBy: feature.createdBy ? Number(feature.createdBy) : null,
        geometryData: feature.geometryData,
        info: feature.info,
        boundaryId: feature.boundaryId ? Number(feature.boundaryId) : null,
        createdAt: feature.createdAt,
        lastUpdated: feature.lastUpdated
      }));
    } catch (error) {
      console.error('MongoDB getFeaturesByType error:', error);
      return [];
    }
  }

  async getFeaturesByStatus(status: string): Promise<FeatureType[]> {
    try {
      const features = await Feature.find({ feaStatus: status });
      
      return features.map(feature => ({
        id: feature.id,
        name: feature.name,
        feaNo: feature.feaNo,
        feaState: feature.feaState as any,
        feaStatus: feature.feaStatus as any,
        feaType: feature.feaType as any,
        specificType: feature.specificType as any,
        maintenance: feature.maintenance as "Required" | "None",
        createdBy: feature.createdBy ? Number(feature.createdBy) : null,
        geometryData: feature.geometryData,
        info: feature.info,
        boundaryId: feature.boundaryId ? Number(feature.boundaryId) : null,
        createdAt: feature.createdAt,
        lastUpdated: feature.lastUpdated
      }));
    } catch (error) {
      console.error('MongoDB getFeaturesByStatus error:', error);
      return [];
    }
  }

  async getAllFeatures(): Promise<FeatureType[]> {
    try {
      const features = await Feature.find();
      
      return features.map(feature => ({
        id: feature.id,
        name: feature.name,
        feaNo: feature.feaNo,
        feaState: feature.feaState as any,
        feaStatus: feature.feaStatus as any,
        feaType: feature.feaType as any,
        specificType: feature.specificType as any,
        maintenance: feature.maintenance as "Required" | "None",
        createdBy: feature.createdBy ? Number(feature.createdBy) : null,
        geometryData: feature.geometryData,
        info: feature.info,
        boundaryId: feature.boundaryId ? Number(feature.boundaryId) : null,
        createdAt: feature.createdAt,
        lastUpdated: feature.lastUpdated
      }));
    } catch (error) {
      console.error('MongoDB getAllFeatures error:', error);
      return [];
    }
  }

  // Boundary operations
  async createBoundary(boundary: InsertBoundary): Promise<BoundaryType> {
    try {
      // Find the highest id and increment by 1
      const maxIdBoundary = await Boundary.findOne().sort({ id: -1 });
      const nextId = maxIdBoundary ? maxIdBoundary.id + 1 : 1;
      
      const newBoundary = new Boundary({
        id: nextId,
        name: boundary.name,
        description: boundary.description || null,
        status: boundary.status || 'New',
        assignedTo: boundary.assignedTo || null,
        geometry: boundary.geometry,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newBoundary.save();
      
      return {
        id: newBoundary.id,
        name: newBoundary.name,
        description: newBoundary.description,
        status: newBoundary.status as any,
        assignedTo: newBoundary.assignedTo ? Number(newBoundary.assignedTo) : null,
        geometry: newBoundary.geometry,
        createdAt: newBoundary.createdAt,
        updatedAt: newBoundary.updatedAt
      };
    } catch (error) {
      console.error('MongoDB createBoundary error:', error);
      throw error;
    }
  }

  async getBoundary(id: number): Promise<BoundaryType | undefined> {
    try {
      const boundary = await Boundary.findOne({ id });
      if (!boundary) return undefined;
      
      return {
        id: boundary.id,
        name: boundary.name,
        description: boundary.description,
        status: boundary.status as any,
        assignedTo: boundary.assignedTo ? Number(boundary.assignedTo) : null,
        geometry: boundary.geometry,
        createdAt: boundary.createdAt,
        updatedAt: boundary.updatedAt
      };
    } catch (error) {
      console.error('MongoDB getBoundary error:', error);
      return undefined;
    }
  }

  async updateBoundaryStatus(id: number, status: string): Promise<BoundaryType> {
    try {
      const boundary = await Boundary.findOneAndUpdate(
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
        assignedTo: boundary.assignedTo ? Number(boundary.assignedTo) : null,
        geometry: boundary.geometry,
        createdAt: boundary.createdAt,
        updatedAt: boundary.updatedAt
      };
    } catch (error) {
      console.error('MongoDB updateBoundaryStatus error:', error);
      throw error;
    }
  }

  async assignBoundary(id: number, userId: number): Promise<BoundaryType> {
    try {
      const boundary = await Boundary.findOneAndUpdate(
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
        assignedTo: boundary.assignedTo ? Number(boundary.assignedTo) : null,
        geometry: boundary.geometry,
        createdAt: boundary.createdAt,
        updatedAt: boundary.updatedAt
      };
    } catch (error) {
      console.error('MongoDB assignBoundary error:', error);
      throw error;
    }
  }

  async getAllBoundaries(): Promise<BoundaryType[]> {
    try {
      const boundaries = await Boundary.find();
      
      return boundaries.map(boundary => ({
        id: boundary.id,
        name: boundary.name,
        description: boundary.description,
        status: boundary.status as any,
        assignedTo: boundary.assignedTo ? Number(boundary.assignedTo) : null,
        geometry: boundary.geometry,
        createdAt: boundary.createdAt,
        updatedAt: boundary.updatedAt
      }));
    } catch (error) {
      console.error('MongoDB getAllBoundaries error:', error);
      return [];
    }
  }
}
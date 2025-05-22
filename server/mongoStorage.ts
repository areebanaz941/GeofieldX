import mongoose from 'mongoose';
import { IStorage } from './storage';
import * as schema from '@shared/schema';

/**
 * MongoStorage implementation of IStorage interface
 * This class handles all database operations using MongoDB models
 */
export class MongoStorage implements IStorage {
  constructor() {
    console.log('Initializing MongoDB storage');
  }

  // User operations
  async getUser(id: number): Promise<any> {
    try {
      const user = await schema.User.findOne({ id });
      return user ? user.toObject() : undefined;
    } catch (error) {
      console.error('MongoDB Error - getUser:', error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<any> {
    try {
      const user = await schema.User.findOne({ username });
      return user ? user.toObject() : undefined;
    } catch (error) {
      console.error('MongoDB Error - getUserByUsername:', error);
      throw error;
    }
  }

  async createUser(userData: any): Promise<any> {
    try {
      const newUser = new schema.User({
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActive: null,
        currentLocation: null
      });
      
      await newUser.save();
      return newUser.toObject();
    } catch (error) {
      console.error('MongoDB Error - createUser:', error);
      throw error;
    }
  }

  async updateUserLocation(id: number, location: { lat: number, lng: number }): Promise<any> {
    try {
      const user = await schema.User.findOneAndUpdate(
        { id },
        { 
          currentLocation: { 
            type: 'Point', 
            coordinates: [location.lng, location.lat] 
          },
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!user) {
        throw new Error(`User with ID ${id} not found`);
      }
      
      return user.toObject();
    } catch (error) {
      console.error('MongoDB Error - updateUserLocation:', error);
      throw error;
    }
  }

  async updateUserLastActive(id: number): Promise<any> {
    try {
      const user = await schema.User.findOneAndUpdate(
        { id },
        { 
          lastActive: new Date(),
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!user) {
        throw new Error(`User with ID ${id} not found`);
      }
      
      return user.toObject();
    } catch (error) {
      console.error('MongoDB Error - updateUserLastActive:', error);
      throw error;
    }
  }

  async getAllFieldUsers(): Promise<any[]> {
    try {
      const users = await schema.User.find({ role: 'Field' });
      return users.map(user => user.toObject());
    } catch (error) {
      console.error('MongoDB Error - getAllFieldUsers:', error);
      throw error;
    }
  }

  // Team operations
  async createTeam(teamData: any): Promise<any> {
    try {
      const newTeam = new schema.Team({
        ...teamData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newTeam.save();
      return newTeam.toObject();
    } catch (error) {
      console.error('MongoDB Error - createTeam:', error);
      throw error;
    }
  }

  async getTeam(id: number): Promise<any> {
    try {
      const team = await schema.Team.findOne({ id });
      return team ? team.toObject() : undefined;
    } catch (error) {
      console.error('MongoDB Error - getTeam:', error);
      throw error;
    }
  }

  async getTeamByName(name: string): Promise<any> {
    try {
      const team = await schema.Team.findOne({ name });
      return team ? team.toObject() : undefined;
    } catch (error) {
      console.error('MongoDB Error - getTeamByName:', error);
      throw error;
    }
  }

  async updateTeamStatus(id: number, status: string, approvedBy?: number): Promise<any> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date()
      };
      
      if (approvedBy) {
        updateData.approvedBy = approvedBy;
      }
      
      const team = await schema.Team.findOneAndUpdate(
        { id },
        updateData,
        { new: true }
      );
      
      if (!team) {
        throw new Error(`Team with ID ${id} not found`);
      }
      
      return team.toObject();
    } catch (error) {
      console.error('MongoDB Error - updateTeamStatus:', error);
      throw error;
    }
  }

  async getAllTeams(): Promise<any[]> {
    try {
      const teams = await schema.Team.find();
      return teams.map(team => team.toObject());
    } catch (error) {
      console.error('MongoDB Error - getAllTeams:', error);
      throw error;
    }
  }

  async getUsersByTeam(teamId: number): Promise<any[]> {
    try {
      const users = await schema.User.find({ teamId });
      return users.map(user => user.toObject());
    } catch (error) {
      console.error('MongoDB Error - getUsersByTeam:', error);
      throw error;
    }
  }

  async assignUserToTeam(userId: number, teamId: number): Promise<any> {
    try {
      const user = await schema.User.findOneAndUpdate(
        { id: userId },
        { 
          teamId,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      return user.toObject();
    } catch (error) {
      console.error('MongoDB Error - assignUserToTeam:', error);
      throw error;
    }
  }

  // Task operations
  async createTask(taskData: any): Promise<any> {
    try {
      const newTask = new schema.Task({
        ...taskData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newTask.save();
      return newTask.toObject();
    } catch (error) {
      console.error('MongoDB Error - createTask:', error);
      throw error;
    }
  }

  async getTask(id: number): Promise<any> {
    try {
      const task = await schema.Task.findOne({ id });
      return task ? task.toObject() : undefined;
    } catch (error) {
      console.error('MongoDB Error - getTask:', error);
      throw error;
    }
  }

  async updateTaskStatus(id: number, status: string, userId: number): Promise<any> {
    try {
      const task = await schema.Task.findOneAndUpdate(
        { id },
        { 
          status,
          updatedAt: new Date(),
          lastUpdatedBy: userId
        },
        { new: true }
      );
      
      if (!task) {
        throw new Error(`Task with ID ${id} not found`);
      }
      
      return task.toObject();
    } catch (error) {
      console.error('MongoDB Error - updateTaskStatus:', error);
      throw error;
    }
  }

  async assignTask(id: number, assignedTo: number): Promise<any> {
    try {
      const task = await schema.Task.findOneAndUpdate(
        { id },
        { 
          assignedTo,
          status: 'Assigned',
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!task) {
        throw new Error(`Task with ID ${id} not found`);
      }
      
      return task.toObject();
    } catch (error) {
      console.error('MongoDB Error - assignTask:', error);
      throw error;
    }
  }

  async getTasksByAssignee(userId: number): Promise<any[]> {
    try {
      const tasks = await schema.Task.find({ assignedTo: userId });
      return tasks.map(task => task.toObject());
    } catch (error) {
      console.error('MongoDB Error - getTasksByAssignee:', error);
      throw error;
    }
  }

  async getTasksByCreator(userId: number): Promise<any[]> {
    try {
      const tasks = await schema.Task.find({ createdBy: userId });
      return tasks.map(task => task.toObject());
    } catch (error) {
      console.error('MongoDB Error - getTasksByCreator:', error);
      throw error;
    }
  }

  async getAllTasks(): Promise<any[]> {
    try {
      const tasks = await schema.Task.find();
      return tasks.map(task => task.toObject());
    } catch (error) {
      console.error('MongoDB Error - getAllTasks:', error);
      throw error;
    }
  }

  // Feature operations
  async createFeature(featureData: any): Promise<any> {
    try {
      const newFeature = new schema.Feature({
        ...featureData,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUpdated: new Date()
      });
      
      await newFeature.save();
      return newFeature.toObject();
    } catch (error) {
      console.error('MongoDB Error - createFeature:', error);
      throw error;
    }
  }

  async getFeature(id: number): Promise<any> {
    try {
      const feature = await schema.Feature.findOne({ id });
      return feature ? feature.toObject() : undefined;
    } catch (error) {
      console.error('MongoDB Error - getFeature:', error);
      throw error;
    }
  }

  async updateFeature(id: number, featureUpdate: Partial<any>): Promise<any> {
    try {
      const feature = await schema.Feature.findOneAndUpdate(
        { id },
        { 
          ...featureUpdate,
          updatedAt: new Date(),
          lastUpdated: new Date()
        },
        { new: true }
      );
      
      if (!feature) {
        throw new Error(`Feature with ID ${id} not found`);
      }
      
      return feature.toObject();
    } catch (error) {
      console.error('MongoDB Error - updateFeature:', error);
      throw error;
    }
  }

  async deleteFeature(id: number): Promise<boolean> {
    try {
      const result = await schema.Feature.deleteOne({ id });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('MongoDB Error - deleteFeature:', error);
      throw error;
    }
  }

  async getFeaturesByType(type: string): Promise<any[]> {
    try {
      const features = await schema.Feature.find({ feaType: type });
      return features.map(feature => feature.toObject());
    } catch (error) {
      console.error('MongoDB Error - getFeaturesByType:', error);
      throw error;
    }
  }

  async getFeaturesByStatus(status: string): Promise<any[]> {
    try {
      const features = await schema.Feature.find({ feaStatus: status });
      return features.map(feature => feature.toObject());
    } catch (error) {
      console.error('MongoDB Error - getFeaturesByStatus:', error);
      throw error;
    }
  }

  async getAllFeatures(): Promise<any[]> {
    try {
      const features = await schema.Feature.find();
      return features.map(feature => feature.toObject());
    } catch (error) {
      console.error('MongoDB Error - getAllFeatures:', error);
      throw error;
    }
  }

  // Boundary operations
  async createBoundary(boundaryData: any): Promise<any> {
    try {
      const newBoundary = new schema.Boundary({
        ...boundaryData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newBoundary.save();
      return newBoundary.toObject();
    } catch (error) {
      console.error('MongoDB Error - createBoundary:', error);
      throw error;
    }
  }

  async getBoundary(id: number): Promise<any> {
    try {
      const boundary = await schema.Boundary.findOne({ id });
      return boundary ? boundary.toObject() : undefined;
    } catch (error) {
      console.error('MongoDB Error - getBoundary:', error);
      throw error;
    }
  }

  async updateBoundaryStatus(id: number, status: string): Promise<any> {
    try {
      const boundary = await schema.Boundary.findOneAndUpdate(
        { id },
        { 
          status,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!boundary) {
        throw new Error(`Boundary with ID ${id} not found`);
      }
      
      return boundary.toObject();
    } catch (error) {
      console.error('MongoDB Error - updateBoundaryStatus:', error);
      throw error;
    }
  }

  async assignBoundary(id: number, userId: number): Promise<any> {
    try {
      const boundary = await schema.Boundary.findOneAndUpdate(
        { id },
        { 
          assignedTo: userId,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!boundary) {
        throw new Error(`Boundary with ID ${id} not found`);
      }
      
      return boundary.toObject();
    } catch (error) {
      console.error('MongoDB Error - assignBoundary:', error);
      throw error;
    }
  }

  async getAllBoundaries(): Promise<any[]> {
    try {
      const boundaries = await schema.Boundary.find();
      return boundaries.map(boundary => boundary.toObject());
    } catch (error) {
      console.error('MongoDB Error - getAllBoundaries:', error);
      throw error;
    }
  }

  // Task update operations
  async createTaskUpdate(updateData: any): Promise<any> {
    try {
      const newUpdate = new schema.TaskUpdate({
        ...updateData,
        createdAt: new Date()
      });
      
      await newUpdate.save();
      return newUpdate.toObject();
    } catch (error) {
      console.error('MongoDB Error - createTaskUpdate:', error);
      throw error;
    }
  }

  async getTaskUpdates(taskId: number): Promise<any[]> {
    try {
      const updates = await schema.TaskUpdate.find({ taskId }).sort({ createdAt: -1 });
      return updates.map(update => update.toObject());
    } catch (error) {
      console.error('MongoDB Error - getTaskUpdates:', error);
      throw error;
    }
  }

  // Task evidence operations
  async addTaskEvidence(evidenceData: any): Promise<any> {
    try {
      const newEvidence = new schema.TaskEvidence({
        ...evidenceData,
        createdAt: new Date()
      });
      
      await newEvidence.save();
      return newEvidence.toObject();
    } catch (error) {
      console.error('MongoDB Error - addTaskEvidence:', error);
      throw error;
    }
  }

  async getTaskEvidence(taskId: number): Promise<any[]> {
    try {
      const evidence = await schema.TaskEvidence.find({ taskId }).sort({ createdAt: -1 });
      return evidence.map(item => item.toObject());
    } catch (error) {
      console.error('MongoDB Error - getTaskEvidence:', error);
      throw error;
    }
  }
}
import { apiRequest, setAuthToken } from './queryClient';
import type { 
  User, 
  Task, 
  Feature, 
  Boundary, 
  TaskUpdate,
  TaskEvidence, 
  InsertUser, 
  InsertTask,
  InsertFeature,
  Team,
  InsertTeam
} from '@shared/schema';

// Auth API
export async function login(username: string, password: string) {
  const res = await apiRequest('POST', '/api/login', { username, password });
  const data = await res.json();
  
  // Store JWT token if provided
  if (data.token) {
    setAuthToken(data.token);
  }
  
  return data;
}

export async function logout() {
  const res = await apiRequest('POST', '/api/logout');
  
  // Clear JWT token on logout
  setAuthToken(null);
  
  return await res.json();
}

export async function getCurrentUser() {
  const res = await apiRequest('GET', '/api/current-user');
  return await res.json();
}

export async function register(userData: InsertUser) {
  const res = await apiRequest('POST', '/api/users', userData);
  return await res.json();
}

// User API
export async function getFieldUsers() {
  const res = await apiRequest('GET', '/api/users/field');
  return await res.json();
}



export async function updateUserLocation(lat: number, lng: number) {
  const res = await apiRequest('POST', '/api/users/location', { lat, lng });
  return await res.json();
}

// Task API
export async function createTask(taskData: InsertTask) {
  const res = await apiRequest('POST', '/api/tasks', taskData);
  return await res.json();
}

export async function getAllTasks() {
  const res = await apiRequest('GET', '/api/tasks');
  return await res.json();
}

export async function getMyTasks() {
  const res = await apiRequest('GET', '/api/tasks/my-tasks');
  return await res.json();
}

export async function updateTaskStatus(taskId: number, status: string) {
  const res = await apiRequest('PUT', `/api/tasks/${taskId}/status`, { status });
  return await res.json();
}

export async function assignTask(taskId: number, assignedTo: number) {
  const res = await apiRequest('PUT', `/api/tasks/${taskId}/assign`, { assignedTo });
  return await res.json();
}

export async function deleteTask(taskId: string) {
  const res = await apiRequest('DELETE', `/api/tasks/${taskId}`);
  return await res.json();
}

// Task Updates API
export async function createTaskUpdate(taskId: number, comment: string, oldStatus?: string, newStatus?: string) {
  const res = await apiRequest('POST', `/api/tasks/${taskId}/updates`, {
    comment,
    oldStatus,
    newStatus
  });
  return await res.json();
}

export async function getTaskUpdates(taskId: number) {
  const res = await apiRequest('GET', `/api/tasks/${taskId}/updates`);
  return await res.json();
}

// Task Evidence API
export async function addTaskEvidence(taskId: number, formData: FormData) {
  // Use fetch directly for file uploads
  const res = await fetch(`/api/tasks/${taskId}/evidence`, {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });
  
  if (!res.ok) {
    throw new Error('Failed to upload evidence');
  }
  
  return await res.json();
}

export async function getTaskEvidence(taskId: number) {
  const res = await apiRequest('GET', `/api/tasks/${taskId}/evidence`);
  return await res.json();
}

// Feature API
export async function createFeature(featureData: any) {
  // If there are image files, use FormData to upload them
  if (featureData.images && featureData.images.length > 0 && featureData.images[0] instanceof File) {
    console.log("🎯 Creating feature with image files:", featureData.images);
    
    const formData = new FormData();
    
    // Add all non-image fields to FormData
    Object.keys(featureData).forEach(key => {
      if (key !== 'images') {
        const value = featureData[key];
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
      }
    });
    
    // Add image files
    featureData.images.forEach((file: File) => {
      formData.append('images', file);
    });
    
    // Use fetch directly for FormData uploads with JWT token
    const authToken = localStorage.getItem('auth_token');
    const headers: HeadersInit = {};
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    
    const res = await fetch('/api/features', {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers
    });
    
    if (!res.ok) {
      throw new Error('Failed to create feature');
    }
    
    return await res.json();
  } else {
    // No images or already processed, send as JSON
    console.log("🎯 Creating feature without images");
    const res = await apiRequest('POST', '/api/features', featureData);
    return await res.json();
  }
}

export async function getAllFeatures() {
  const res = await apiRequest('GET', '/api/features');
  return await res.json();
}

export async function getFeature(featureId: string) {
  const res = await apiRequest('GET', `/api/features/${featureId}`);
  return await res.json();
}

export async function updateFeature(featureId: string, featureData: any) {
  // If there are image files, use FormData to upload them
  if (featureData.images && featureData.images.length > 0 && featureData.images[0] instanceof File) {
    console.log("🎯 Updating feature with image files:", featureData.images);
    
    const formData = new FormData();
    
    // Add all non-image fields to FormData
    Object.keys(featureData).forEach(key => {
      if (key !== 'images') {
        const value = featureData[key];
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
      }
    });
    
    // Add image files
    featureData.images.forEach((file: File) => {
      formData.append('images', file);
    });
    
    // Use fetch directly for FormData uploads
    const res = await fetch(`/api/features/${featureId}`, {
      method: 'PATCH',
      body: formData,
      credentials: 'include'
    });
    
    if (!res.ok) {
      throw new Error('Failed to update feature');
    }
    
    return await res.json();
  } else {
    // No images or already processed, send as JSON
    console.log("🎯 Updating feature without images");
    const res = await apiRequest('PATCH', `/api/features/${featureId}`, featureData);
    return await res.json();
  }
}

export async function deleteFeature(featureId: string) {
  const res = await apiRequest('DELETE', `/api/features/${featureId}`);
  return await res.json();
}

export async function assignFeatureToTeam(featureId: string, teamId: string) {
  const res = await apiRequest('PUT', `/api/features/${featureId}/assign`, { teamId });
  return await res.json();
}

export async function assignBoundaryToTeam(boundaryId: string, teamId: string) {
  const res = await apiRequest('PUT', `/api/boundaries/${boundaryId}/assign`, { teamId });
  return await res.json();
}

// Boundary API
export async function createBoundary(boundaryData: any) {
  const res = await apiRequest('POST', '/api/boundaries', boundaryData);
  return await res.json();
}

export async function createParcel(parcelData: { name: string; coordinates: number[][][] }) {
  const boundaryData = {
    name: parcelData.name,
    description: `Parcel drawn on map - ${parcelData.name}`,
    geometry: {
      type: "Polygon",
      coordinates: parcelData.coordinates
    },
    status: "New"
  };
  const res = await apiRequest('POST', '/api/boundaries', boundaryData);
  return await res.json();
}

export async function getAllBoundaries() {
  const res = await apiRequest('GET', '/api/boundaries');
  return await res.json();
}

export async function getBoundary(boundaryId: string) {
  const res = await apiRequest('GET', `/api/boundaries/${boundaryId}`);
  return await res.json();
}

export async function deleteBoundary(boundaryId: string) {
  const res = await apiRequest('DELETE', `/api/boundaries/${boundaryId}`);
  return await res.json();
}

export async function updateBoundaryStatus(boundaryId: number, status: string) {
  const res = await apiRequest('PUT', `/api/boundaries/${boundaryId}/status`, { status });
  return await res.json();
}

export async function assignBoundary(boundaryId: number, assignedTo: number) {
  const res = await apiRequest('PUT', `/api/boundaries/${boundaryId}/assign`, { assignedTo });
  return await res.json();
}

// Team API
export async function createTeam(teamData: InsertTeam) {
  const res = await apiRequest('POST', '/api/teams', teamData);
  return await res.json();
}

export async function getAllTeams() {
  const res = await apiRequest('GET', '/api/teams');
  return await res.json();
}

export async function getTeam(teamId: number) {
  const res = await apiRequest('GET', `/api/teams/${teamId}`);
  return await res.json();
}

export async function updateTeamStatus(teamId: number, status: string) {
  const res = await apiRequest('PATCH', `/api/teams/${teamId}/status`, { status });
  return await res.json();
}

export async function getTeamMembers(teamId: number) {
  const res = await apiRequest('GET', `/api/teams/${teamId}/members`);
  return await res.json();
}

export async function assignUserToTeam(userId: number, teamId: number) {
  const res = await apiRequest('POST', `/api/users/${userId}/assign-team`, { teamId });
  return await res.json();
}

export async function getUsersByTeam(teamId: string) {
  const res = await apiRequest('GET', `/api/teams/${teamId}/users`);
  return await res.json();
}

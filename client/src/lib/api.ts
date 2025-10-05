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

// Helper function to safely parse JSON responses
async function safeJsonResponse(res: Response) {
  try {
    const text = await res.text();
    if (!text) {
      console.warn('Empty response received');
      return null;
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to parse JSON response:', error);
    throw new Error('Invalid JSON response from server');
  }
}

// Auth API
export async function login(username: string, password: string) {
  try {
    const res = await apiRequest('POST', '/api/login', { username, password });
    const data = await safeJsonResponse(res);
    
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid login response format');
    }
    
    // Store JWT token if provided
    if (data.token) {
      setAuthToken(data.token);
    }
    
    return data;
  } catch (error) {
    console.error('Login API error:', error);
    throw error;
  }
}

export async function logout() {
  try {
    const res = await apiRequest('POST', '/api/logout');
    
    // Clear JWT token on logout
    setAuthToken(null);
    
    return await safeJsonResponse(res);
  } catch (error) {
    console.error('Logout API error:', error);
    throw error;
  }
}

export async function getCurrentUser() {
  try {
    const res = await apiRequest('GET', '/api/current-user');
    const userData = await safeJsonResponse(res);
    
    if (!userData || typeof userData !== 'object') {
      console.warn('getCurrentUser returned invalid data:', userData);
      return null;
    }
    
    return userData;
  } catch (error) {
    // Gracefully handle unauthenticated state without noisy stack traces
    if (error instanceof Error && (error.message.includes('401') || error.message.includes('Not authenticated'))) {
      console.warn('[Auth] getCurrentUser returned 401 - user not logged in');
      return null;
    }
    console.error('getCurrentUser API error:', error);
    throw error;
  }
}

export async function register(userData: InsertUser) {
  try {
    const res = await apiRequest('POST', '/api/users', userData);
    return await safeJsonResponse(res);
  } catch (error) {
    console.error('Register API error:', error);
    throw error;
  }
}

// User API
export async function getFieldUsers() {
  try {
    const res = await apiRequest('GET', '/api/users/field');
    return await safeJsonResponse(res);
  } catch (error) {
    console.error('getFieldUsers API error:', error);
    throw error;
  }
}



export async function updateUserLocation(lat: number, lng: number) {
  try {
    const res = await apiRequest('POST', '/api/users/location', { lat, lng });
    return await safeJsonResponse(res);
  } catch (error) {
    console.error('updateUserLocation API error:', error);
    throw error;
  }
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

export async function updateTaskStatus(taskId: string, status: string) {
  const res = await apiRequest('PUT', `/api/tasks/${taskId}/status`, { status });
  return await res.json();
}

export async function assignTask(taskId: string, assignedTo: number) {
  const res = await apiRequest('PUT', `/api/tasks/${taskId}/assign`, { assignedTo });
  return await res.json();
}

export async function deleteTask(taskId: string) {
  const res = await apiRequest('DELETE', `/api/tasks/${taskId}`);
  return await res.json();
}

// Task Updates API
export async function createTaskUpdate(taskId: string, comment: string, oldStatus?: string, newStatus?: string) {
  const res = await apiRequest('POST', `/api/tasks/${taskId}/updates`, {
    comment,
    oldStatus,
    newStatus
  });
  return await res.json();
}

export async function getTaskUpdates(taskId: string) {
  const res = await apiRequest('GET', `/api/tasks/${taskId}/updates`);
  return await res.json();
}

// Task Evidence API
export async function addTaskEvidence(taskId: string, formData: FormData) {
  // Use fetch directly for file uploads
  const authToken = localStorage.getItem('auth_token');
  const headers: HeadersInit = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(`/api/tasks/${taskId}/evidence`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers
  });
  
  if (!res.ok) {
    throw new Error('Failed to upload evidence');
  }
  
  return await res.json();
}

export async function getTaskEvidence(taskId: string) {
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
    } else {
      console.warn('No auth token found when creating feature');
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

// Delete a single image attached to a feature
export async function deleteFeatureImage(featureId: string, image: { imageId?: string; imagePath?: string }) {
  // Use fetch to send a JSON body with DELETE (some servers require this)
  const authToken = localStorage.getItem('auth_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await fetch(`/api/features/${featureId}/images`, {
    method: 'DELETE',
    credentials: 'include',
    headers,
    body: JSON.stringify(image)
  });
  if (!res.ok) {
    throw new Error('Failed to delete feature image');
  }
  return await res.json();
}

// Delete a raw image by GridFS id and purge references
export async function deleteImageById(imageId: string) {
  const res = await apiRequest('DELETE', `/api/images/${imageId}`);
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

export async function updateBoundary(boundaryId: string, data: any) {
  const res = await apiRequest('PATCH', `/api/boundaries/${boundaryId}`, data);
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

export async function deleteTeam(teamId: string) {
  const res = await apiRequest('DELETE', `/api/teams/${teamId}`);
  return await res.json();
}

export async function assignUserToTeam(userId: string, teamId: string) {
  const res = await apiRequest('POST', `/api/users/${userId}/assign-team`, { teamId });
  return await res.json();
}

export async function unassignUserFromTeam(userId: string) {
  const res = await apiRequest('POST', `/api/users/${userId}/unassign-team`);
  return await res.json();
}

export async function getUsersByTeam(teamId: string) {
  const res = await apiRequest('GET', `/api/teams/${teamId}/users`);
  return await res.json();
}

// Shapefile API
export async function getAllShapefiles() {
  const res = await apiRequest('GET', '/api/shapefiles');
  return await res.json();
}

export async function getShapefile(id: string) {
  const res = await apiRequest('GET', `/api/shapefiles/${id}`);
  return await res.json();
}

export async function deleteShapefile(id: string) {
  const res = await apiRequest('DELETE', `/api/shapefiles/${id}`);
  return await res.json();
}

export async function updateShapefileVisibility(id: string, isVisible: boolean) {
  const res = await apiRequest('PUT', `/api/shapefiles/${id}/visibility`, { isVisible });
  return await res.json();
}

import mongoose from 'mongoose';

// MongoDB connection string from environment variable
const MONGODB_URI = process.env.MONGODB_URI as string;

// Set additional mongoose options for better compatibility
mongoose.set('strictQuery', false);

// Connect to MongoDB and handle connection events
async function connectToMongoDB(): Promise<boolean> {
  try {
    // Check if we have a MongoDB URI
    if (!MONGODB_URI) {
      console.error('MONGODB_URI environment variable is not set. Please set it to connect to MongoDB.');
      console.error('Using file storage as fallback...');
      return false;
    }
    
    console.log('Connecting to MongoDB...');
    // Safely log the connection string format without exposing credentials
    const maskedUri = MONGODB_URI.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/g, 'mongodb$1://$2:****@');
    console.log('Connection string format:', maskedUri);
    
    // Add additional options for better connection reliability
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Give up initial connection after 10 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });
    
    console.log('Connected to MongoDB successfully');
    
    // Verify the connection is working with a simple operation
    if (mongoose.connection.db) {
      const adminDb = mongoose.connection.db.admin();
      const result = await adminDb.ping();
      console.log('MongoDB ping test:', result ? 'Successful' : 'Failed');
    } else {
      console.log('MongoDB connection not fully established');
    }
    
    return true;
  } catch (error: any) {
    console.error('MongoDB connection error details:');
    console.error('- Error name:', error.name || 'Unknown error');
    console.error('- Error message:', error.message || 'No error message');
    
    if (error.message && typeof error.message === 'string') {
      if (error.message.includes('ENOTFOUND')) {
        console.error('Cannot resolve MongoDB hostname. Check your connection string.');
      } else if (error.message.includes('Authentication failed')) {
        console.error('Authentication failed. Check your username and password.');
      } else if (error.message.includes('timed out')) {
        console.error('Connection timed out. Check your network or MongoDB Atlas network settings.');
      }
    }
    
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectToMongoDB, 5000);
    return false;
  }
}

// MongoDB connection event handlers
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected, trying to reconnect...');
  setTimeout(connectToMongoDB, 5000);
});

// Define schemas
const UserSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['Supervisor', 'Field'], required: true },
  teamId: { type: Number, default: null },
  lastActive: { type: Date, default: null },
  currentLocation: { type: Object, default: null },
  createdAt: { type: Date, default: Date.now }
});

const TeamSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['Pending', 'Approved', 'Rejected'], 
    default: 'Pending'
  },
  createdBy: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  approvedBy: { type: Number, default: null }
});

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: null },
  status: { 
    type: String, 
    enum: ['Unassigned', 'Assigned', 'In Progress', 'Completed', 'In-Complete', 'Submit-Review', 'Review_Accepted', 'Review_Reject', 'Review_inprogress'], 
    default: 'Unassigned'
  },
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Urgent'], 
    required: true 
  },
  createdBy: { type: Number, default: null },
  assignedTo: { type: Number, default: null },
  dueDate: { type: Date, default: null },
  location: { type: Object, default: null },
  boundaryId: { type: Number, default: null },
  featureId: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const FeatureSchema = new mongoose.Schema({
  name: { type: String, required: true },
  feaNo: { type: String, required: true },
  feaState: { 
    type: String, 
    enum: ['Plan', 'Under Construction', 'As-Built', 'Abandoned'], 
    required: true 
  },
  feaStatus: { 
    type: String, 
    enum: ['New', 'InProgress', 'Completed', 'In-Completed', 'Submit-Review', 'Review_Accepted', 'Review_Reject', 'Review_inprogress', 'Active'], 
    required: true 
  },
  feaType: { 
    type: String, 
    enum: ['Tower', 'Manhole', 'FiberCable', 'Parcel'], 
    required: true 
  },
  specificType: { 
    type: String, 
    enum: ['Mobillink', 'Ptcl', '2-way', '4-way', '10F', '24F', 'Commercial', 'Residential'], 
    required: true 
  },
  maintenance: { 
    type: String, 
    enum: ['Required', 'None'], 
    default: 'None' 
  },
  createdBy: { type: Number, default: null },
  geometry: { type: Object, required: true },
  remarks: { type: String, default: null },
  maintenanceDate: { type: Date, default: null },
  boundaryId: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now }
});

const BoundarySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: null },
  status: { 
    type: String, 
    enum: ['New', 'InProgress', 'Completed', 'In-Completed', 'Submit-Review', 'Review_Accepted', 'Review_Reject', 'Review_inprogress', 'Active'], 
    default: 'New' 
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  geometry: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const TaskUpdateSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  taskId: { type: Number, required: true },
  userId: { type: Number, required: true },
  comment: { type: String, default: null },
  oldStatus: { 
    type: String, 
    enum: ['Unassigned', 'Assigned', 'In Progress', 'Completed', 'In-Complete', 'Submit-Review', 'Review_Accepted', 'Review_Reject', 'Review_inprogress', null],
    default: null
  },
  newStatus: { 
    type: String, 
    enum: ['Unassigned', 'Assigned', 'In Progress', 'Completed', 'In-Complete', 'Submit-Review', 'Review_Accepted', 'Review_Reject', 'Review_inprogress', null],
    default: null
  },
  createdAt: { type: Date, default: Date.now }
});

const TaskEvidenceSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  taskId: { type: Number, required: true },
  userId: { type: Number, required: true },
  imageUrl: { type: String, required: true },
  description: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', UserSchema);
const Team = mongoose.model('Team', TeamSchema);
const Task = mongoose.model('Task', TaskSchema);
const Feature = mongoose.model('Feature', FeatureSchema);
const Boundary = mongoose.model('Boundary', BoundarySchema);
const TaskUpdate = mongoose.model('TaskUpdate', TaskUpdateSchema);
const TaskEvidence = mongoose.model('TaskEvidence', TaskEvidenceSchema);

export {
  connectToMongoDB,
  User,
  Team,
  Task,
  Feature,
  Boundary,
  TaskUpdate,
  TaskEvidence
};
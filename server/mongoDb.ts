import mongoose from 'mongoose';

// MongoDB connection string - Using a simpler URI format to avoid connection issues
const MONGODB_URI = 'mongodb://localhost:27017/geowhats';

// Set additional mongoose options for better compatibility
mongoose.set('strictQuery', false);

// Connect to MongoDB and handle connection events
async function connectToMongoDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Try again after a delay
    setTimeout(connectToMongoDB, 5000);
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
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  dueDate: { type: Date, default: null },
  location: { type: Object, default: null },
  boundaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boundary', default: null },
  featureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Feature', default: null },
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
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  geometryData: { type: Object, required: true },
  info: { type: String, default: null },
  boundaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Boundary', default: null },
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
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
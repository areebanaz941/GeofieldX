import mongoose from 'mongoose';

// Get MongoDB connection string from environment
const MONGODB_URI = process.env.MONGODB_URI || '';

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
  tls: true,
  tlsAllowInvalidCertificates: true,
} as mongoose.ConnectOptions;

/**
 * Connects to MongoDB using mongoose
 * @returns Promise resolving to the mongoose connection
 */
export async function connectToMongoDB() {
  if (!MONGODB_URI) {
    throw new Error('MongoDB connection string is not defined!');
  }

  try {
    console.log('Connecting to MongoDB Atlas...');
    const connection = await mongoose.connect(MONGODB_URI, options);
    console.log('Successfully connected to MongoDB Atlas!');
    return connection;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}
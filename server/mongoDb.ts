import mongoose from 'mongoose';

// Connect to MongoDB with better error handling
export async function connectToMongoDB() {
  try {
    // Use the MongoDB connection string from environment variables
    const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
    
    if (!uri) {
      throw new Error('MongoDB connection string is not defined in environment variables');
    }
    
    // Ensure the connection string has the correct format
    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
      throw new Error('Invalid MongoDB connection string format. Must start with mongodb:// or mongodb+srv://');
    }
    
    console.log('Attempting to connect to MongoDB...');
    
    // Connect to MongoDB with improved options
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
    });
    
    console.log('MongoDB connection successful!');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
}

// Add connection event listeners
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});
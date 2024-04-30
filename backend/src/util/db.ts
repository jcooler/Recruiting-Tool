import mongoose from 'mongoose';

let db: mongoose.Connection | undefined;

async function connectDB() {
  if (db) {
    return db;
  }

  const connectionString = process.env.MONGO_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("MongoDB connection string is not defined in environment variables.");
  }

  // Connect to MongoDB
  await mongoose.connect(connectionString);
  db = mongoose.connection;
  return db;
}

export default connectDB;

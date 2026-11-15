import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB connection lost. Reconnection will be attempted.');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB connection restored.');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err.message);
});

export async function connectDB() {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  console.log(`MongoDB connected (${mongoose.connection.name})`);
}

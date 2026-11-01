import mongoose from 'mongoose';
import { env } from './env';

export async function connectDatabase(uri?: string): Promise<typeof mongoose> {
  const mongoUri = uri || env.MONGODB_URI;

  try {
    const conn = await mongoose.connect(mongoUri, {
      autoIndex: true
    });
    console.log(`[MongoDB] Connected successfully to ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected successfully');
  } catch (error) {
    console.error('[MongoDB] Disconnect error:', error);
    throw error;
  }
}

import mongoose from 'mongoose';
import { Logger } from '../utils/logger';
import { config } from '../config';

export class Database {
  private static instance: Database;
  private readonly logger = new Logger('Database');
  private isConnected = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      this.logger.info('Already connected to MongoDB');
      return;
    }

    try {
      mongoose.set('strictQuery', false);

      const connectionOptions: mongoose.ConnectOptions = {
        maxPoolSize: 10,
        minPoolSize: 2,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000,
        keepAlive: true,
        keepAliveInitialDelay: 300000, // 5 minutes
      };

      this.logger.info(`Connecting to MongoDB at ${config.database.uri}`);
      await mongoose.connect(config.database.uri, connectionOptions);

      this.isConnected = true;
      this.logger.info('Successfully connected to MongoDB');

      // Handle connection events
      mongoose.connection.on('disconnected', () => {
        this.logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        this.logger.info('MongoDB reconnected');
        this.isConnected = true;
      });

      mongoose.connection.on('error', (error) => {
        this.logger.error(`MongoDB connection error: ${error}`);
      });

    } catch (error) {
      this.logger.error(`Failed to connect to MongoDB: ${error}`);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      this.logger.info('Disconnected from MongoDB');
    } catch (error) {
      this.logger.error(`Error disconnecting from MongoDB: ${error}`);
      throw error;
    }
  }

  public isConnectedToDatabase(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

// Export a singleton instance
export const databaseService = Database.getInstance();

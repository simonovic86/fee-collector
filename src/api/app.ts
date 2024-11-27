import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { Logger } from '../utils';
import { config } from '../config';
import { eventsRouter, healthRouter } from './routes';
import { Server } from 'http';

const app = express();
const logger = new Logger('API');
let server: Server | null = null;

// Parse CORS origins from environment variable
function parseOrigins(originsString: string): (string | RegExp)[] {
  if (originsString === '*') return [originsString];
  
  return originsString.split(',').map(origin => {
    origin = origin.trim();
    // Convert wildcard patterns to RegExp
    if (origin.includes('*')) {
      return new RegExp('^' + origin.replace(/\*/g, '.*') + '$');
    }
    return origin;
  });
}

// CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = parseOrigins(config.server.corsOrigin || '*');
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    // Check if the origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin === '*') return true;
      if (allowedOrigin instanceof RegExp) return allowedOrigin.test(origin);
      return allowedOrigin === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
  credentials: true
};

// Apply middleware
app.use(cors(corsOptions));
app.use(express.json());

// Mount routers
app.use('/health', healthRouter);
app.use('/api', eventsRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(`API error: ${err}`);
  res.status(500).json({ error: 'Internal server error' });
});

/**
 * Initializes and starts the Express server
 * Sets up CORS, middleware, routes, and error handling
 * @returns Promise<express.Application> - Resolved when server starts successfully
 * @throws Error if server fails to start
 */
export async function startServer(): Promise<express.Application> {
  return new Promise((resolve, reject) => {
    try {
      server = app.listen(config.server.port, () => {
        logger.info(`API server listening on port ${config.server.port}`);
        resolve(app);
      });

      server.on('error', (error) => {
        logger.error(`Failed to start server: ${error}`);
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Gracefully stops the Express server
 * @returns Promise<void> - Resolved when server is stopped
 */
export async function stopServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }

    server.close((error) => {
      if (error) {
        logger.error(`Error stopping server: ${error}`);
        reject(error);
      } else {
        logger.info('Server stopped successfully');
        server = null;
        resolve();
      }
    });
  });
}

export { app };

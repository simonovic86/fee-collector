import 'reflect-metadata';
import { config } from './config';
import { validateConfig } from './config/validate';
import { EventScanner } from './services';
import { databaseService } from './services';
import { Logger } from './utils';
import { startServer, stopServer } from './api';

const logger = new Logger('Main');
const scanners: EventScanner[] = [];
let isShuttingDown = false;
let isServerRunning = false;

/**
 * Main application entry point
 * Handles initialization of scanners, database connection, and API server
 * Includes graceful shutdown handling
 */

/**
 * Gracefully shuts down the application
 * Stops all scanners and closes database connections
 * @param signal - The signal that triggered the shutdown
 */
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.info('Shutdown already in progress...');
    return;
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Stop API server first if it was started
    if (isServerRunning) {
      await stopServer();
      logger.info('API server stopped');
    }

    // Then stop scanners
    await Promise.all(scanners.map(scanner => scanner.stop()));
    logger.info('All scanners stopped');

    // Finally close database connection
    if (databaseService.isConnectedToDatabase()) {
      await databaseService.disconnect();
      logger.info('Database connection closed');
    }

    process.exit(0);
  } catch (error) {
    logger.error(`Error during shutdown: ${error}`);
    process.exit(1);
  }
}

/**
 * Initializes and starts all application components
 * Sets up error handlers, connects to database, starts scanners and API server
 * @throws Error if initialization fails
 */
async function main() {
  try {
    // Validate configuration
    validateConfig();

    // Set up shutdown handlers
    ['SIGTERM', 'SIGINT', 'SIGUSR2'].forEach(signal => {
      process.on(signal, () => shutdown(signal));
    });

    process.on('uncaughtException', error => {
      logger.error(`Uncaught exception: ${error}`);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', reason => {
      logger.error(`Unhandled rejection: ${reason}`);
      shutdown('unhandledRejection');
    });

    // Connect to database
    await databaseService.connect();

    // Start API server if enabled
    if (config.server.enabled) {
      await startServer();
      isServerRunning = true;
      logger.info('API server started successfully');
    } else {
      logger.info('API server disabled');
    }

    // Initialize and start scanners
    scanners.push(...config.chains.map(chain => new EventScanner(chain)));
    await Promise.all(scanners.map(scanner => scanner.start()));
    logger.info('All scanners started successfully');

  } catch (error) {
    logger.error(`Application error: ${error}`);
    await shutdown('startup-error');
  }
}

main().then(r => r).catch(e => logger.error(`Main error: ${e}`));

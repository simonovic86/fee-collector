import pino from 'pino';

export interface ILogger {
  info(message: string): void;
  error(message: string): void;
  debug(message: string): void;
  warn(message: string): void;
}

export class Logger implements ILogger {
  private logger: pino.Logger;

  constructor(moduleName: string) {
    this.logger = pino({
      name: moduleName,
      level: process.env.LOG_LEVEL || 'info',
    });
  }

  public info(message: string): void {
    this.logger.info(message);
  }

  public error(message: string): void {
    this.logger.error(message);
  }

  public debug(message: string): void {
    this.logger.debug(message);
  }

  public warn(message: string): void {
    this.logger.warn(message);
  }
}

import { ILogger } from '../../src/utils';

export class MockLogger implements ILogger {
  public logs: { level: string; message: string }[] = [];

  public info(message: string): void {
    this.logs.push({ level: 'info', message });
  }

  public error(message: string): void {
    this.logs.push({ level: 'error', message });
  }

  public debug(message: string): void {
    this.logs.push({ level: 'debug', message });
  }

  public warn(message: string): void {
    this.logs.push({ level: 'warn', message });
  }

  public clear(): void {
    this.logs = [];
  }

  public getLogsByLevel(level: string): string[] {
    return this.logs
      .filter(log => log.level === level)
      .map(log => log.message);
  }
}

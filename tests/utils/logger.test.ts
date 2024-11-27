import { Logger, ILogger } from '../../src/utils';
import { MockLogger } from '../mocks/logger';

describe('Logger', () => {
  let logger: ILogger;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockLogger = new MockLogger();
    logger = mockLogger;
  });

  afterEach(() => {
    mockLogger.clear();
  });

  it('should log info messages', () => {
    logger.info('test info message');
    expect(mockLogger.getLogsByLevel('info')).toContain('test info message');
  });

  it('should log error messages', () => {
    logger.error('test error message');
    expect(mockLogger.getLogsByLevel('error')).toContain('test error message');
  });

  it('should log debug messages', () => {
    logger.debug('test debug message');
    expect(mockLogger.getLogsByLevel('debug')).toContain('test debug message');
  });

  it('should log warn messages', () => {
    logger.warn('test warn message');
    expect(mockLogger.getLogsByLevel('warn')).toContain('test warn message');
  });

  it('should respect log level', () => {
    const realLogger = new Logger('TestModule');
    process.env.LOG_LEVEL = 'error';

    // These shouldn't throw
    realLogger.error('error message');
    realLogger.info('info message');
    realLogger.debug('debug message');
    realLogger.warn('warn message');
  });

  it('should include module name in pino configuration', () => {
    const moduleName = 'TestModule';
    const realLogger = new Logger(moduleName);
    expect((realLogger as any).logger.bindings()).toHaveProperty('name', moduleName);
  });
});

import { Retry } from '../../src/utils';
import { Logger } from '../../src/utils';

describe('Retry', () => {
  let retry: Retry;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    retry = new Retry(mockLogger, {
      attempts: 3,
      delay: 100,
    });
  });

  it('should succeed on first attempt', async () => {
    const operation = jest.fn().mockResolvedValue('success');

    const result = await retry.retryOperation(operation, 'test');

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('should retry on failure and succeed', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValueOnce('success');

    const result = await retry.retryOperation(operation, 'test');

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
  });

  it('should throw after max attempts', async () => {
    const error = new Error('persistent failure');
    const operation = jest.fn().mockRejectedValue(error);

    await expect(retry.retryOperation(operation, 'test'))
      .rejects.toThrow(error);

    expect(operation).toHaveBeenCalledTimes(3);
    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
  });

  it('should respect increasing delay between retries', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValueOnce('success');

    const startTime = Date.now();
    await retry.retryOperation(operation, 'test');
    const duration = Date.now() - startTime;

    // First retry after 100ms, second after 200ms
    expect(duration).toBeGreaterThanOrEqual(300);
  });
});

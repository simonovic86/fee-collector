import { Logger } from './logger';

export class Retry {
  constructor(
    private readonly logger: Logger,
    private readonly config: { attempts: number; delay: number }
  ) {}

  async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.config.attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt === this.config.attempts) break;

        this.logger.warn(
          `Operation ${operationName} failed (attempt ${attempt}/${this.config.attempts}): ${error}`
        );
        await new Promise(resolve => setTimeout(resolve, this.config.delay * attempt));
      }
    }

    throw lastError;
  }
}

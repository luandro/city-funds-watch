/**
 * Application Logger
 *
 * Provides consistent logging across the application with environment-aware
 * behavior and structured logging support.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDev = import.meta.env.DEV;
  private isProd = import.meta.env.PROD;

  /**
   * Log debug information (dev only)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDev) {
      console.debug(`[DEBUG] ${message}`, context || '');
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, context?: LogContext): void {
    if (this.isDev) {
      console.info(`[INFO] ${message}`, context || '');
    }
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context || '');
  }

  /**
   * Log errors with safe context
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.isDev) {
      // Full details in development
      console.error(`[ERROR] ${message}`, {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error,
        ...context,
      });
    } else {
      // Minimal logging in production (avoid exposing internals)
      console.error(`[ERROR] ${message}`);

      // TODO: Send to error tracking service (Sentry, etc.)
      // this.sendToErrorTracker(message, error, context);
    }
  }

  /**
   * Log with custom level
   */
  log(level: LogLevel, message: string, context?: LogContext): void {
    switch (level) {
      case 'debug':
        this.debug(message, context);
        break;
      case 'info':
        this.info(message, context);
        break;
      case 'warn':
        this.warn(message, context);
        break;
      case 'error':
        this.error(message, undefined, context);
        break;
    }
  }

  /**
   * Create a scoped logger for a specific module
   */
  scope(moduleName: string): ScopedLogger {
    return new ScopedLogger(this, moduleName);
  }
}

class ScopedLogger {
  constructor(
    private logger: Logger,
    private moduleName: string
  ) {}

  private formatMessage(message: string): string {
    return `[${this.moduleName}] ${message}`;
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(this.formatMessage(message), context);
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(this.formatMessage(message), context);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(this.formatMessage(message), context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    this.logger.error(this.formatMessage(message), error, context);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { Logger, ScopedLogger };

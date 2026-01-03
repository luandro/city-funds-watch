import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log levels', () => {
    it('should log debug messages with context', () => {
      logger.debug('Debug message', { context: 'test' });

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Debug message'),
        expect.objectContaining({ context: 'test' })
      );
    });

    it('should log debug messages without context', () => {
      logger.debug('Debug message');

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Debug message'),
        ''
      );
    });

    it('should log info messages with context', () => {
      logger.info('Info message', { userId: 123 });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Info message'),
        expect.objectContaining({ userId: 123 })
      );
    });

    it('should log info messages without context', () => {
      logger.info('Info message');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Info message'),
        ''
      );
    });

    it('should log warnings with context', () => {
      logger.warn('Warning message', { code: 'WARN_001' });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning message'),
        expect.objectContaining({ code: 'WARN_001' })
      );
    });

    it('should log warnings without context', () => {
      logger.warn('Warning message');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning message'),
        ''
      );
    });

    it('should log errors with Error object and context', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error, { requestId: 'abc123' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error occurred'),
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Test error',
            name: 'Error',
          }),
          requestId: 'abc123',
        })
      );
    });

    it('should log errors with non-Error object', () => {
      logger.error('Error occurred', 'String error');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error occurred'),
        expect.objectContaining({
          error: 'String error',
        })
      );
    });

    it('should log errors without error object', () => {
      logger.error('Error occurred');

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('log prefixes', () => {
    it('should prefix debug logs with [DEBUG]', () => {
      logger.debug('Test');

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        expect.anything()
      );
    });

    it('should prefix info logs with [INFO]', () => {
      logger.info('Test');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.anything()
      );
    });

    it('should prefix warn logs with [WARN]', () => {
      logger.warn('Test');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        expect.anything()
      );
    });

    it('should prefix error logs with [ERROR]', () => {
      logger.error('Test');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.anything()
      );
    });
  });

  describe('environment handling', () => {
    it('should log debug in development mode', () => {
      // In Vitest with Vite, import.meta.env.DEV is true by default in tests
      logger.debug('Test debug');

      expect(consoleDebugSpy).toHaveBeenCalled();
    });

    it('should log info in development mode', () => {
      logger.info('Test info');

      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should always log warnings regardless of environment', () => {
      logger.warn('Test warning');

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should log errors with full details in development mode', () => {
      const error = new Error('Test error');
      error.stack = 'Stack trace here';

      logger.error('Error occurred', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Test error',
            stack: 'Stack trace here',
            name: 'Error',
          }),
        })
      );
    });
  });

  describe('custom log method', () => {
    it('should route debug level to debug method', () => {
      logger.log('debug', 'Test message', { key: 'value' });

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test message'),
        expect.objectContaining({ key: 'value' })
      );
    });

    it('should route info level to info method', () => {
      logger.log('info', 'Test message', { key: 'value' });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test message'),
        expect.objectContaining({ key: 'value' })
      );
    });

    it('should route warn level to warn method', () => {
      logger.log('warn', 'Test message', { key: 'value' });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test message'),
        expect.objectContaining({ key: 'value' })
      );
    });

    it('should route error level to error method', () => {
      logger.log('error', 'Test message', { key: 'value' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test message'),
        expect.objectContaining({
          error: undefined,
          key: 'value',
        })
      );
    });
  });

  describe('scoped logger', () => {
    it('should create scoped logger with module name', () => {
      const scopedLogger = logger.scope('DataService');

      scopedLogger.debug('Loading data');

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] [DataService] Loading data'),
        expect.anything()
      );
    });

    it('should scope info messages', () => {
      const scopedLogger = logger.scope('AuthService');

      scopedLogger.info('User logged in');

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] [AuthService] User logged in'),
        expect.anything()
      );
    });

    it('should scope warn messages', () => {
      const scopedLogger = logger.scope('CacheService');

      scopedLogger.warn('Cache miss');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] [CacheService] Cache miss'),
        expect.anything()
      );
    });

    it('should scope error messages', () => {
      const scopedLogger = logger.scope('ApiService');
      const error = new Error('Network error');

      scopedLogger.error('Request failed', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] [ApiService] Request failed'),
        expect.anything()
      );
    });

    it('should allow multiple scoped loggers', () => {
      const logger1 = logger.scope('Module1');
      const logger2 = logger.scope('Module2');

      logger1.info('Message from Module1');
      logger2.info('Message from Module2');

      expect(consoleInfoSpy).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('[Module1]'),
        expect.anything()
      );
      expect(consoleInfoSpy).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('[Module2]'),
        expect.anything()
      );
    });
  });
});

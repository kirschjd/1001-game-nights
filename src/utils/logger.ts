// src/utils/logger.ts
// Environment-aware logging utility

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private enabled: boolean;
  private prefix: string;

  constructor(prefix: string = '') {
    this.enabled = process.env.NODE_ENV === 'development';
    this.prefix = prefix ? `[${prefix}]` : '';
  }

  /**
   * Standard log (only in development)
   */
  log(...args: any[]): void {
    if (this.enabled) {
      console.log(this.prefix, ...args);
    }
  }

  /**
   * Info log (only in development)
   */
  info(...args: any[]): void {
    if (this.enabled) {
      console.info(this.prefix, ...args);
    }
  }

  /**
   * Warning log (only in development)
   */
  warn(...args: any[]): void {
    if (this.enabled) {
      console.warn(this.prefix, ...args);
    }
  }

  /**
   * Error log (always enabled, even in production)
   */
  error(...args: any[]): void {
    console.error(this.prefix, ...args);
  }

  /**
   * Debug log (only in development)
   */
  debug(...args: any[]): void {
    if (this.enabled) {
      console.debug(this.prefix, ...args);
    }
  }

  /**
   * Table log (only in development)
   */
  table(data: any): void {
    if (this.enabled && console.table) {
      console.table(data);
    }
  }

  /**
   * Group logs together (only in development)
   */
  group(label: string, callback: () => void): void {
    if (this.enabled && console.group) {
      console.group(this.prefix + ' ' + label);
      callback();
      console.groupEnd();
    } else if (this.enabled) {
      callback();
    }
  }

  /**
   * Force enable logging (for debugging)
   */
  forceEnable(): void {
    this.enabled = true;
  }

  /**
   * Force disable logging
   */
  forceDisable(): void {
    this.enabled = false;
  }
}

// Create default logger instance
export const logger = new Logger();

// Create named logger with prefix
export function createLogger(prefix: string): Logger {
  return new Logger(prefix);
}

// Convenience loggers for different modules
export const socketLogger = new Logger('Socket');
export const gameLogger = new Logger('Game');
export const lobbyLogger = new Logger('Lobby');
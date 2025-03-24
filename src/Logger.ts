import * as fs from 'fs';
import * as path from 'path';

/**
 * Logger class for writing messages to log files
 */
export class Logger {
  private logDir: string;
  private logFile: string;

  /**
   * Create a new Logger instance
   * @param filename - Name of the log file (without .log extension)
   */
  constructor(filename: string) {
    this.logDir = path.join('C:', 'logs');
    this.logFile = path.join(this.logDir, `${filename}.log`);
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Log an error message
   * @param message - The error message
   * @param error - Optional error object
   */
  error(message: string, error?: unknown): void {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const logEntry = `[${timestamp}] ERROR: ${message} ${errorMessage}\n`;
    
    fs.appendFileSync(this.logFile, logEntry);
    // console.error(message, errorMessage); // Keep console output for development
  }

  /**
   * Log an info message
   * @param message - The info message
   */
  info(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] INFO: ${message}\n`;
    
    fs.appendFileSync(this.logFile, logEntry);
    // console.log(message); // Keep console output for development
  }

  /**
   * Log a warning message
   * @param message - The warning message
   */
  warn(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] WARN: ${message}\n`;
    
    fs.appendFileSync(this.logFile, logEntry);
    // console.warn(message); // Keep console output for development
  }
} 
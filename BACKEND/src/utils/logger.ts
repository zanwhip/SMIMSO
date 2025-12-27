type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (args.length > 0) {
      return `${prefix} ${message} ${JSON.stringify(args, null, this.isDevelopment ? 2 : 0)}`;
    }
    return `${prefix} ${message}`;
  }

  info(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.log(this.formatMessage('info', message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage('warn', message, ...args));
  }

  error(message: string, error?: Error | unknown, ...args: any[]): void {
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: this.isDevelopment ? error.stack : undefined }
      : error;
    
    console.error(this.formatMessage('error', message, errorDetails, ...args));
  }

  debug(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, ...args));
    }
  }
}

export const logger = new Logger();
export default logger;



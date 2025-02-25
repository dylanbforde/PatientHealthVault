type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug';

class BrowserLogger {
  private isDevelopment = import.meta.env.MODE === 'development';

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  error(message: string, meta?: any) {
    console.error(this.formatMessage('error', message, meta));
  }

  warn(message: string, meta?: any) {
    console.warn(this.formatMessage('warn', message, meta));
  }

  info(message: string, meta?: any) {
    console.info(this.formatMessage('info', message, meta));
  }

  http(message: string, meta?: any) {
    if (this.isDevelopment) {
      console.log(this.formatMessage('http', message, meta));
    }
  }

  debug(message: string, meta?: any) {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }
}

const logger = new BrowserLogger();
export default logger;
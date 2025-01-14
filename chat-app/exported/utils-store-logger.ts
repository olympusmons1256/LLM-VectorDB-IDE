// utils/store-logger.ts
interface LoggerOptions {
    enabled?: boolean;
    level?: 'debug' | 'info' | 'warn' | 'error';
    prefix?: string;
    includeDiff?: boolean;
    includeTimestamp?: boolean;
    maxArrayLength?: number;
    redactKeys?: string[];
  }
  
  interface LogEntry {
    timestamp: string;
    level: string;
    prefix: string;
    action: string;
    data?: any;
    diff?: {
      added: any[];
      updated: any[];
      removed: any[];
    };
  }
  
  export class StoreLogger {
    private enabled: boolean;
    private level: string;
    private prefix: string;
    private includeDiff: boolean;
    private includeTimestamp: boolean;
    private maxArrayLength: number;
    private redactKeys: string[];
    private lastState: any = {};
  
    constructor(options: LoggerOptions = {}) {
      this.enabled = options.enabled ?? (process.env.NODE_ENV === 'development');
      this.level = options.level ?? 'debug';
      this.prefix = options.prefix ?? 'Store';
      this.includeDiff = options.includeDiff ?? true;
      this.includeTimestamp = options.includeTimestamp ?? true;
      this.maxArrayLength = options.maxArrayLength ?? 3;
      this.redactKeys = options.redactKeys ?? ['password', 'token', 'key', 'secret'];
    }
  
    logStateChange(action: string, prevState: any, nextState: any): void {
      if (!this.enabled) return;
  
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'debug',
        prefix: this.prefix,
        action,
      };
  
      // Add state diff if enabled
      if (this.includeDiff) {
        entry.diff = this.computeDiff(prevState, nextState);
      }
  
      // Add sanitized state data
      entry.data = this.sanitizeState(nextState);
  
      this.log(entry);
      this.lastState = nextState;
    }
  
    debug(message: string, data?: any): void {
      if (!this.enabled || this.getLevelValue(this.level) > this.getLevelValue('debug')) return;
      this.logMessage('debug', message, data);
    }
  
    info(message: string, data?: any): void {
      if (!this.enabled || this.getLevelValue(this.level) > this.getLevelValue('info')) return;
      this.logMessage('info', message, data);
    }
  
    warn(message: string, data?: any): void {
      if (!this.enabled || this.getLevelValue(this.level) > this.getLevelValue('warn')) return;
      this.logMessage('warn', message, data);
    }
  
    error(message: string, error?: Error, data?: any): void {
      if (!this.enabled || this.getLevelValue(this.level) > this.getLevelValue('error')) return;
      this.logMessage('error', message, { error: error?.message || error, data });
    }
  
    private logMessage(level: string, message: string, data?: any): void {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        prefix: this.prefix,
        action: message,
      };
  
      if (data !== undefined) {
        entry.data = this.sanitizeState(data);
      }
  
      this.log(entry);
    }
  
    private log(entry: LogEntry): void {
      const timestamp = this.includeTimestamp ? `[${entry.timestamp}] ` : '';
      const prefix = `[${entry.prefix}] `;
      const level = `[${entry.level.toUpperCase()}] `;
  
      // Format the message
      let message = `${timestamp}${prefix}${level}${entry.action}`;
  
      // Add data if present
      if (entry.data) {
        if (typeof entry.data === 'string') {
          message += `: ${entry.data}`;
        } else {
          message += '\n' + JSON.stringify(entry.data, null, 2);
        }
      }
  
      // Add diff if present
      if (entry.diff) {
        message += '\nChanges:';
        if (entry.diff.added.length) {
          message += '\n  Added: ' + JSON.stringify(entry.diff.added);
        }
        if (entry.diff.updated.length) {
          message += '\n  Updated: ' + JSON.stringify(entry.diff.updated);
        }
        if (entry.diff.removed.length) {
          message += '\n  Removed: ' + JSON.stringify(entry.diff.removed);
        }
      }
  
      // Log with appropriate level
      switch (entry.level) {
        case 'error':
          console.error(message);
          break;
        case 'warn':
          console.warn(message);
          break;
        case 'info':
          console.info(message);
          break;
        default:
          console.log(message);
      }
    }
  
    private sanitizeState(state: any): any {
      if (!state) return state;
  
      if (Array.isArray(state)) {
        return state.slice(0, this.maxArrayLength).map(item => this.sanitizeState(item));
      }
  
      if (typeof state === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(state)) {
          if (this.redactKeys.some(redactKey => key.toLowerCase().includes(redactKey))) {
            sanitized[key] = '[REDACTED]';
          } else {
            sanitized[key] = this.sanitizeState(value);
          }
        }
        return sanitized;
      }
  
      return state;
    }
  
    private computeDiff(prev: any, next: any): LogEntry['diff'] {
      const added: any[] = [];
      const updated: any[] = [];
      const removed: any[] = [];
  
      // Find added and updated
      for (const key in next) {
        if (!(key in prev)) {
          added.push({ [key]: next[key] });
        } else if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) {
          updated.push({
            key,
            from: prev[key],
            to: next[key]
          });
        }
      }
  
      // Find removed
      for (const key in prev) {
        if (!(key in next)) {
          removed.push({ [key]: prev[key] });
        }
      }
  
      return { added, updated, removed };
    }
  
    private getLevelValue(level: string): number {
      switch (level) {
        case 'debug': return 0;
        case 'info': return 1;
        case 'warn': return 2;
        case 'error': return 3;
        default: return 4;
      }
    }
  }
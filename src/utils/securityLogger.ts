// src/utils/securityLogger.ts
// Sistema di sicurezza per prevenire log di dati sensibili

export class SecurityLogger {
  private static readonly SENSITIVE_PATTERNS = [
    /api[_-]?key/i,
    /access[_-]?token/i,
    /refresh[_-]?token/i,
    /authorization/i,
    /bearer/i,
    /password/i,
    /secret/i,
    /credential/i,
    /auth[_-]?header/i
  ];

  private static readonly SAFE_TO_LOG = [
    'model',
    'temperature',
    'max_tokens',
    'status',
    'count',
    'length',
    'size',
    'found',
    'not found',
    'present',
    'null',
    'success',
    'error',
    'response',
    'request'
  ];

  /**
   * Verifica se un valore contiene dati sensibili
   */
  static isSensitive(value: any): boolean {
    if (typeof value === 'string') {
      return this.SENSITIVE_PATTERNS.some(pattern => pattern.test(value));
    }
    
    if (typeof value === 'object' && value !== null) {
      const jsonString = JSON.stringify(value);
      return this.SENSITIVE_PATTERNS.some(pattern => pattern.test(jsonString));
    }
    
    return false;
  }

  /**
   * Log sicuro che previene esposizione di dati sensibili
   */
  static safeLog(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV !== 'development') {
      return; // Solo in development
    }

    // Verifica se il messaggio contiene dati sensibili
    if (this.isSensitive(message)) {
      console.warn('🚨 SECURITY WARNING: Attempted to log sensitive data blocked');
      return;
    }

    // Verifica gli argomenti
    const safeArgs = args.map(arg => {
      if (this.isSensitive(arg)) {
        return '[SENSITIVE_DATA_BLOCKED]';
      }
      return arg;
    });

    console.log(message, ...safeArgs);
  }

  /**
   * Log di stato senza dati sensibili
   */
  static logStatus(service: string, action: string, status: 'success' | 'error' | 'info'): void {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : 'ℹ️';
    console.log(`${icon} ${service}: ${action} - ${status}`);
  }

  /**
   * Log di conteggio sicuro
   */
  static logCount(service: string, item: string, count: number): void {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    console.log(`${service}: ${count} ${item}${count !== 1 ? 's' : ''}`);
  }
}

// Funzione helper per sostituire console.log
export const safeConsole = {
  log: SecurityLogger.safeLog,
  status: SecurityLogger.logStatus,
  count: SecurityLogger.logCount
};

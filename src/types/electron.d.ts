// Definizione completa dell'interfaccia ElectronAPI
export interface ElectronAPI {
  ping: () => Promise<string>;
  getAppVersion: () => Promise<string>;
  getPlatform: () => string;
  storeGet: (key: string) => Promise<unknown>;
  storeSet: (key: string, value: unknown) => Promise<boolean>;
  sendMessage: (msg: string) => void;
  // Browser automation handlers removed
  log: (message: string) => Promise<void>;
  testIPC: () => Promise<{success: boolean; message: string}>;
  
  // N8N Integration - Calendar reminders
  createReminder: (payload: {
    title: string;
    summary: string;
    startISO: string;
    endISO: string;
    user_id?: string;
  }) => Promise<{
    ok: boolean;
    status: number;
    body: string;
    json: unknown;
  }>;
  
  // N8N Create Reminder via IPC (fallback se fetch fallisce)
  n8nCreateReminder: (payload: {
    title: string;
    summary: string;
    startISO: string;
    endISO: string;
    user_id?: string;
  }, url: string) => Promise<{
    ok: boolean;
    status: number;
    body: string;
    json: unknown;
  }>;
  
  // Browser automation functions removed
  
  // ActionExecutor per gestione azioni
  executeAction: (actionData: {
    intent: string;
    platform: string;
    query: string;
    actionRequired: boolean;
    userConfirmed: boolean;
    reasoning: string;
  }) => Promise<{
    success: boolean;
    message: string;
    url?: string;
    error?: string;
  }>;
  
  // FactChecker per verifica informazioni
  scrapeFactInfo: (factData: {
    factType: string;
    question: string;
    sources: string[];
  }) => Promise<{
    success: boolean;
    data?: {
      title: string;
      name: string;
      startDate: string;
    };
    url?: string;
    error?: string;
  }>;
  
  // System browser integration only
  openExternal: (url: string) => Promise<{
    success: boolean;
    message: string;
    url?: string;
  }>;
  
  // Nuovi metodi per sistema conversazionale
  executeScript: (script: string) => Promise<{
    success: boolean;
    result?: unknown;
    error?: string;
  }>;
  
  apriSito: (url: string) => Promise<{
    success: boolean;
    url?: string;
    error?: string;
  }>;

  // OAuth2 integration
  initOAuthDatabase: (dbPath: string) => Promise<void>;
  generateOAuthUrl: (userId: string, state?: string) => Promise<string>;
  startOAuthFlow: (userId: string, useSystemBrowser?: boolean) => Promise<{
    success: boolean;
    url?: string;
    code?: string;
    state?: string;
    method?: string;
  }>;
  exchangeOAuthCode: (code: string) => Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: string;
    token_type: string;
    scope: string;
  }>;
  refreshOAuthToken: (refreshToken: string) => Promise<{
    access_token: string;
    expires_at: string;
    token_type: string;
  }>;
  verifyOAuthToken: (accessToken: string) => Promise<{
    valid: boolean;
    user?: any;
    error?: string;
  }>;
  getOAuthUserInfo: (accessToken: string) => Promise<any>;
  saveOAuthTokens: (userId: string, tokenData: any) => Promise<number>;
  getOAuthTokens: (userId: string) => Promise<any>;
  updateOAuthAccessToken: (userId: string, accessToken: string, expiresAt: string) => Promise<boolean>;
  revokeOAuthTokens: (userId: string) => Promise<boolean>;
  logOAuthAudit: (userId: string, action: string, details?: string) => Promise<number>;
  cleanExpiredOAuthTokens: () => Promise<number>;
  getValidOAuthToken: (userId: string) => Promise<{
    success: boolean;
    access_token?: string;
    token_type?: string;
    expires_at?: string;
    scope?: string;
    refreshed?: boolean;
    error?: string;
    requires_auth?: boolean;
  }>;
  
  // OAuth callback listener
  onOAuthCallback?: (callback: (data: any) => void) => void;
  removeOAuthCallbackListener?: (callback: (data: any) => void) => void;
  
  // OpenRouter sicuro - NUOVO
  openRouterCall: (messages: Array<{role: string; content: string}>, model?: string) => Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }>;
}

// Dichiarazione globale per window.electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI;
    ElectronAPI: {
      apriAmazon: (queryOrUrl: string) => Promise<{
        success: boolean;
        message: string;
        url?: string;
        error?: string;
      }>;
    };
  }
}

export {}; 
// Configurazione centralizzata per API Backend
export const API_URL = import.meta.env.VITE_BACKEND_URL || 'https://nyra-backend-c7zi.onrender.com';

// Endpoints API
export const API_ENDPOINTS = {
  // Health check
  HEALTH: '/health',
  
  // Authentication
  AUTH: {
    GOOGLE: '/api/auth/google',
    VERIFY: '/api/auth/verify',
    REFRESH: '/api/auth/refresh',
    GOOGLE_URL: '/api/auth/google-url'
  },
  
  // Email
  EMAIL: {
    GENERATE: '/api/email/generate',
    SEND: '/api/email/send',
    PARSE_EXCEL: '/api/email/parse-excel',
    BULK_GENERATE: '/api/email/bulk-generate'
  },
  
  // AI
  AI: {
    CHAT: '/api/ai/chat',
    TEST: '/api/ai/test',
    ANALYZE_TEXT: '/api/ai/analyze-text',
    GENERATE_CONTENT: '/api/ai/generate-content',
    HEALTH: '/api/ai/health'
  }
};

// Funzioni helper per costruire URL completi
export function getApiUrl(endpoint: string): string {
  return `${API_URL}${endpoint}`;
}

export function getAuthUrl(endpoint: keyof typeof API_ENDPOINTS.AUTH): string {
  return getApiUrl(API_ENDPOINTS.AUTH[endpoint]);
}

export function getEmailUrl(endpoint: keyof typeof API_ENDPOINTS.EMAIL): string {
  return getApiUrl(API_ENDPOINTS.EMAIL[endpoint]);
}

export function getAiUrl(endpoint: keyof typeof API_ENDPOINTS.AI): string {
  return getApiUrl(API_ENDPOINTS.AI[endpoint]);
}

// Configurazione per fetch requests
export const API_CONFIG = {
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include' as RequestCredentials
};

// Funzione helper per fetch API
export async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = getApiUrl(endpoint);
  
  const response = await fetch(url, {
    ...API_CONFIG,
    ...options,
    headers: {
      ...API_CONFIG.headers,
      ...options.headers
    }
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

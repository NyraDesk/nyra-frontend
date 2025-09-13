// Configurazione per API esterne
export const EXTERNAL_APIS = {
  
  // Gmail API
  GMAIL: {
    BASE_URL: 'https://gmail.googleapis.com/gmail/v1',
    ENDPOINTS: {
      MESSAGES: '/users/me/messages',
      SEND: '/users/me/messages/send',
      MODIFY: '/users/me/messages/{messageId}/modify',
      TRASH: '/users/me/messages/{messageId}/trash'
    }
  },
  
  // N8N Integration
  N8N: {
    BASE_URL: import.meta.env.VITE_N8N_URL || 'http://localhost:5678',
    WEBHOOK_URL: import.meta.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/nyra/text',
    DEBUG: (import.meta.env.VITE_NYRA_DEBUG_N8N ?? '1') === '1'
  }
};

// Funzioni helper per costruire URL Gmail
export function getGmailUrl(endpoint: string, messageId?: string): string {
  const url = `${EXTERNAL_APIS.GMAIL.BASE_URL}${endpoint}`;
  return messageId ? url.replace('{messageId}', messageId) : url;
}

// Funzioni helper per N8N
export function getN8NWebhookUrl(): string {
  return EXTERNAL_APIS.N8N.WEBHOOK_URL;
}

export function getN8NBaseUrl(): string {
  return EXTERNAL_APIS.N8N.BASE_URL;
}

// Configurazione centralizzata per n8n
export const N8N_URL = import.meta.env.VITE_N8N_URL || 'http://localhost:5678';
export const N8N_CALENDAR_WEBHOOK = `${N8N_URL}/webhook/nyra/text`;
export const NYRA_DEBUG_N8N = (import.meta.env.VITE_NYRA_DEBUG_N8N ?? '1') === '1';

// Configurazione legacy per compatibilità
export const N8N_CONFIG = {
  BASE_URL: N8N_URL,
  ENDPOINTS: {
    CALENDAR_AGENT: '/webhook/calendar-agent',
    HEALTH_CHECK: '/webhook/nyra-health',
    WORKFLOWS: '/webhook/nyra-workflows'
  },
  get CALENDAR_WEBHOOK_URL() {
    return N8N_CALENDAR_WEBHOOK;
  },
  get HEALTH_CHECK_URL() {
    return `${this.BASE_URL}${this.ENDPOINTS.HEALTH_CHECK}`;
  },
  get WORKFLOWS_URL() {
    return `${this.BASE_URL}${this.ENDPOINTS.WORKFLOWS}`;
  }
};

// Funzioni per compatibilità
export function getCalendarWebhookURL(): string {
  return N8N_CALENDAR_WEBHOOK;
}

export function getN8NBaseURL(): string {
  return N8N_URL;
}

// Configurazione centralizzata per Electron
require('dotenv').config();

const config = {
  // N8N Configuration
  N8N: {
    URL: process.env.N8N_URL ?? 'http://localhost:5678',
    ENDPOINTS: {
      CALENDAR_AGENT: '/webhook/nyra/text',
      HEALTH_CHECK: '/webhook/nyra-health',
      WORKFLOWS: '/webhook/nyra-workflows'
    }
  },
  
  // Automation Configuration
  AUTOMATION: {
    ENABLED: process.env.NYRA_ENABLE_AUTOMATION === '1',
    TIMEOUT: 30000, // 30 secondi
    MAX_RETRIES: 3
  },
  
  // App Configuration
  APP: {
    VERSION: process.env.npm_package_version ?? '1.0.0',
    ENV: process.env.NODE_ENV ?? 'development'
  }
};

// Funzioni helper per ottenere URL completi
config.N8N.getCalendarWebhookURL = function() {
  return `${this.URL}${this.ENDPOINTS.CALENDAR_AGENT}`;
};

config.N8N.getHealthCheckURL = function() {
  return `${this.URL}${this.ENDPOINTS.HEALTH_CHECK}`;
};

config.N8N.getWorkflowsURL = function() {
  return `${this.URL}${this.ENDPOINTS.WORKFLOWS}`;
};

module.exports = config;

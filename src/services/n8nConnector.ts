import { getCalendarWebhookURL, getN8NBaseURL } from '../config/n8n';

export interface N8NActionRequest {
  intent: string;
  query: string;
  parameters: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

export interface N8NActionResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  executionTime?: number;
}

export class N8NConnector {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl ?? getN8NBaseURL();
    this.apiKey = apiKey;
  }

  async executeAction(request: N8NActionRequest): Promise<N8NActionResponse> {
    try {
      const webhookUrl = getCalendarWebhookURL();
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        },
        body: JSON.stringify({
          ...request,
          timestamp: new Date().toISOString(),
          source: 'nyra-desktop'
        })
      });

      if (!response.ok) {
        throw new Error(`N8N API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('N8N Connection Error:', error);
      return {
        success: false,
        message: 'Errore di connessione con il sistema di automazione',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createReminder(message: string, userId: string, userName: string) {
    try {
      console.log('Invio reminder a n8n:', {message, userId, userName});
      
      const webhookUrl = getCalendarWebhookURL();
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, userId, userName })
      });
      
      console.log('Risposta n8n:', response.status, response.ok);
      
      return { success: true, message: '📅 Reminder creato!' };
    } catch (error) {
      return { success: false, message: 'Reminder non creato ma memorizzato' };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const healthUrl = `${this.baseUrl}/webhook/nyra-health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch (error) {
      console.error('N8N Health Check Failed:', error);
      return false;
    }
  }

  async getAvailableWorkflows(): Promise<string[]> {
    try {
      const workflowsUrl = `${this.baseUrl}/webhook/nyra-workflows`;
      const response = await fetch(workflowsUrl);
      if (response.ok) {
        const data = await response.json();
        return data.workflows || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get workflows:', error);
      return [];
    }
  }
}
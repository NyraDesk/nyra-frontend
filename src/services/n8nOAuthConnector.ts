// N8N OAuth Connector for NYRA
// Integrates OAuth2 token management with n8n workflows

import { tokenManager } from './oauth/tokenManager';

// Utility function per gestione errori TypeScript
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

interface N8NPayload {
  user_id: string;
  action: string;
  data?: any;
  webhook_url?: string;
}

interface N8NResponse {
  ok: boolean;
  status: number;
  body: string;
  json: any;
  error?: string;
}

class N8NOAuthConnector {
  private baseUrl: string;
  
  constructor(baseUrl: string = 'http://localhost:5678') {
    this.baseUrl = baseUrl;
  }

  // Enhanced n8n request with OAuth token
  async makeAuthenticatedRequest(
    webhookPath: string, 
    payload: N8NPayload,
    requiresAuth: boolean = true
  ): Promise<N8NResponse> {
    try {
      let accessToken = null;
      
      if (requiresAuth) {
        // Get valid OAuth token for the user
        const tokenResponse = await tokenManager.getValidToken(payload.user_id);
        
        if (!tokenResponse.success) {
          if (tokenResponse.requires_auth) {
            throw new Error('User needs to authenticate with Google first');
          }
          throw new Error(tokenResponse.error || 'Failed to get OAuth token');
        }
        
        accessToken = tokenResponse.access_token;
        if (process.env.NODE_ENV === 'development') {
          console.log('[N8N OAuth] Got valid token for user:', payload.user_id);
        }
      }

      // Prepare enhanced payload with OAuth token
      const enhancedPayload = {
        ...payload,
        oauth_token: accessToken,
        timestamp: new Date().toISOString()
      };

      const webhookUrl = `${this.baseUrl}${webhookPath}`;
      console.log(`[N8N OAuth] Making request to: ${webhookUrl}`);

      // Make the request using Electron's fetch or IPC
      const response = await this.makeHttpRequest(webhookUrl, enhancedPayload);
      
      return response;

    } catch (error) {
      console.error('[N8N OAuth] Request failed:', error);
      return {
        ok: false,
        status: 0,
        body: '',
        json: null,
        error: getErrorMessage(error)
      };
    }
  }

  // Make HTTP request through Electron IPC or fetch
  private async makeHttpRequest(url: string, payload: any): Promise<N8NResponse> {
    try {
      // Try using Electron IPC first (for n8n reminders)
      // TODO: Implement createReminder in ElectronAPI
      // if (window.electronAPI && window.electronAPI.createReminder) {
      //   return await window.electronAPI.createReminder(payload);
      // }

      // Fallback to fetch if available
      if (typeof fetch !== 'undefined') {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        const text = await response.text();
        let json = null;
        
        try {
          json = JSON.parse(text);
        } catch {
          // If JSON parsing fails, leave as null
        }

        return {
          ok: response.ok,
          status: response.status,
          body: text,
          json
        };
      }

      throw new Error('No HTTP client available');
    } catch (error) {
      console.error('[N8N OAuth] HTTP request error:', error);
      throw error;
    }
  }

  // Send email via Gmail through n8n
  async sendEmail(userId: string, emailData: {
    to: string;
    subject: string;
    body: string;
    html?: boolean;
  }): Promise<N8NResponse> {
    const payload: N8NPayload = {
      action_type: "email",  // QUESTO CAMPO È OBBLIGATORIO
      email: emailData,
      user_id: userId,
      action: 'send_email'
    };

    return await this.makeAuthenticatedRequest('/webhook/gmail-send', payload, true);
  }

  // Create calendar event through n8n
  async createCalendarEvent(userId: string, eventData: {
    title: string;
    summary?: string;
    startISO: string;
    endISO: string;
    description?: string;
    location?: string;
    attendees?: string[];
  }): Promise<N8NResponse> {
    const payload: N8NPayload = {
      action_type: "calendar",  // QUESTO CAMPO È OBBLIGATORIO
      calendar: eventData,
      user_id: userId,
      action: 'create_event'
    };

    return await this.makeAuthenticatedRequest('/webhook/calendar-agent', payload, true);
  }

  // Process text intent with OAuth (existing functionality enhanced)
  async processTextIntent(userId: string, intentData: {
    text: string;
    intent?: string;
    language?: string;
  }): Promise<N8NResponse> {
    const payload: N8NPayload = {
      user_id: userId,
      action: 'process_text_intent',
      data: intentData
    };

    return await this.makeAuthenticatedRequest('/webhook/nyra-text-intent', payload, true);
  }

  // Process voice intent with OAuth
  async processVoiceIntent(userId: string, voiceData: {
    audio_data?: string;
    transcript?: string;
    language?: string;
  }): Promise<N8NResponse> {
    const payload: N8NPayload = {
      user_id: userId,
      action: 'process_voice_intent',
      data: voiceData
    };

    return await this.makeAuthenticatedRequest('/webhook/nyra-voice-intent', payload, true);
  }

  // Check OAuth status for user
  async checkOAuthStatus(userId: string): Promise<{
    authenticated: boolean;
    expires_at?: string;
    expires_in_minutes?: number;
    needs_refresh?: boolean;
  }> {
    try {
      const tokenResponse = await tokenManager.getValidToken(userId);
      
      if (!tokenResponse.success) {
        return {
          authenticated: false,
          needs_refresh: tokenResponse.requires_auth || false
        };
      }

      // Calculate expiration info
      let expiresInMinutes;
      if (tokenResponse.expires_at) {
        const now = new Date();
        const expiresAt = new Date(tokenResponse.expires_at);
        expiresInMinutes = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60));
      }

      return {
        authenticated: true,
        expires_at: tokenResponse.expires_at,
        expires_in_minutes: expiresInMinutes,
        needs_refresh: tokenResponse.refreshed || false
      };

    } catch (error) {
      console.error('[N8N OAuth] Error checking OAuth status:', error);
      return {
        authenticated: false,
        needs_refresh: true
      };
    }
  }

  // Start OAuth flow for user
  async startOAuthFlow(userId: string): Promise<{
    success: boolean;
    auth_url?: string;
    message: string;
  }> {
    try {
      const authUrl = await tokenManager.startOAuthFlow(userId);
      
      return {
        success: true,
        auth_url: authUrl,
        message: 'OAuth flow started successfully'
      };

    } catch (error) {
      console.error('[N8N OAuth] Error starting OAuth flow:', error);
      return {
        success: false,
        message: getErrorMessage(error) || 'Failed to start OAuth flow'
      };
    }
  }

  // Test OAuth integration
  async testOAuthIntegration(userId: string): Promise<{
    success: boolean;
    services: {
      gmail: boolean;
      calendar: boolean;
    };
    message: string;
  }> {
    try {
      const tokenResponse = await tokenManager.getValidToken(userId);
      
      if (!tokenResponse.success) {
        return {
          success: false,
          services: { gmail: false, calendar: false },
          message: 'OAuth not configured or expired'
        };
      }

      // Test Gmail access (simple scope check)
      const hasGmailScope = tokenResponse.scope?.includes('gmail') || false;
      
      // Test Calendar access (simple scope check)  
      const hasCalendarScope = tokenResponse.scope?.includes('calendar') || false;

      return {
        success: hasGmailScope && hasCalendarScope,
        services: {
          gmail: hasGmailScope,
          calendar: hasCalendarScope
        },
        message: 'OAuth integration test completed'
      };

    } catch (error) {
      console.error('[N8N OAuth] Error testing OAuth integration:', error);
      return {
        success: false,
        services: { gmail: false, calendar: false },
        message: getErrorMessage(error) || 'OAuth test failed'
      };
    }
  }

  // Send to webhook method for email actions
  async sendToWebhook(payload: any) {
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/nyra/text';
    
    // Validazione JSON prima della chiamata
    let jsonString: string;
    try {
      jsonString = JSON.stringify(payload);
      console.log('📤 n8n Webhook - JSON validation: ✅ Valid');
      console.log('📤 n8n Webhook - JSON length:', jsonString.length, 'characters');
    } catch (error) {
      console.error('📤 n8n Webhook - JSON validation: ❌ Invalid JSON:', error);
      throw new Error('Invalid JSON payload');
    }
    
    console.log('📤 n8n Webhook - URL:', webhookUrl);
    console.log('📤 n8n Webhook - Payload:', payload);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: jsonString
    });
    
    // Gestisci risposta vuota o non-JSON
    const responseText = await response.text();
    console.log('📥 n8n Response - Status:', response.status);
    console.log('📥 n8n Response - Text:', responseText);
    
    if (!response.ok) {
      throw new Error(`Webhook error: ${response.statusText}`);
    }
    
    // Se vuota o non JSON, ritorna successo
    if (!responseText || responseText.trim() === '') {
      console.log('✅ n8n Response - Empty, returning success');
      return { success: true };
    }
    
    try {
      const parsedResponse = JSON.parse(responseText);
      console.log('✅ n8n Response - JSON parsed successfully');
      return parsedResponse;
    } catch (e) {
      console.log('⚠️ n8n Response - Not JSON, returning as text');
      return { success: true, response: responseText };
    }
  }
}

// Singleton instance
const n8nOAuthConnector = new N8NOAuthConnector();

export { N8NOAuthConnector, n8nOAuthConnector };
export interface EmailAction {
  action: 'send-email';
  to: string[];
  subject?: string;
  body?: string;
  cc?: string[];
  bcc?: string[];
  originalText?: string;
}

export function isEmailAction(obj: any): obj is EmailAction {
  return obj && obj.action === 'send-email' && Array.isArray(obj.to) && obj.to.length > 0;
}

export function createN8NEmailPayload(action: EmailAction, authToken?: string) {
  return {
    action_type: 'email',
    email: {
      to: action.to,
      subject: action.subject || 'Messaggio da NYRA',
      body: action.body || action.originalText || 'Inviato tramite NYRA Assistant',
      cc: action.cc || [],
      bcc: action.bcc || []
    },
    auth_token: authToken,
    user_agent: navigator.userAgent,
    host: window.location.host,
    timestamp: new Date().toISOString()
  };
}

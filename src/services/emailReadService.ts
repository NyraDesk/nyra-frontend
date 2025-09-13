import { GmailFetchService } from './gmailFetchService';
import { API_URL } from '../config/api';

export interface EmailReadAction {
  action: 'read-email';
  type: 'latest' | 'unread' | 'search' | 'today' | 'week';
  count?: number;
  query?: string;
  filter?: 'received' | 'sent' | 'important';
}

export interface EmailReadResult {
  success: boolean;
  emails: Array<{
    id: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    body?: string; // Contenuto completo dell'email
  }>;
  count: number;
  error?: string;
}

export class EmailReadService {
  private getAccessToken(): string | null {
    try {
      // Prendi userId
      const userData = localStorage.getItem('nyra_user');
      const userId = userData ? JSON.parse(userData).email : null;
      
      if (!userId) {
        return null;
      }
      
      // Prima controlla localStorage per token salvati
      const storedTokens = localStorage.getItem(`nyra_oauth_${userId}`);
      
      if (storedTokens) {
        try {
          const tokens = JSON.parse(storedTokens);
          const expiresAt = new Date(tokens.expires_at);
          const now = new Date();
          
          if (expiresAt > now) {
            return tokens.access_token;
          } else {
            localStorage.removeItem(`nyra_oauth_${userId}`);
          }
        } catch (e) {
          localStorage.removeItem(`nyra_oauth_${userId}`);
        }
      }
      
      // Se non abbiamo token validi, prova il broker
      return null;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  async readEmails(action: EmailReadAction): Promise<EmailReadResult> {
    try {
      const accessToken = this.getAccessToken();
      
      if (!accessToken) {
        // Prova a ottenere token dal broker
        const userData = localStorage.getItem('nyra_user');
        const userId = userData ? JSON.parse(userData).email : null;
        
        if (!userId) {
          return {
            success: false,
            emails: [],
            count: 0,
            error: 'Utente non autenticato'
          };
        }
        
        const brokerUrl = `${import.meta.env.VITE_BROKER_URL || API_URL}/auth/google/status?user_id=${encodeURIComponent(userId)}`;
        const response = await fetch(brokerUrl, { credentials: 'include' });
        
        if (!response.ok) {
          return {
            success: false,
            emails: [],
            count: 0,
            error: 'Connessione Google non disponibile'
          };
        }
        
        const data = await response.json();
        
        if (!data?.gmail?.connected || !data?.gmail?.access_token) {
          return {
            success: false,
            emails: [],
            count: 0,
            error: 'Token Gmail non disponibili'
          };
        }
        
        // Usa il token del broker
        const gmailService = new GmailFetchService(data.gmail.access_token);
        return await this.fetchEmails(gmailService, action);
      }
      
      // Usa il token locale
      const gmailService = new GmailFetchService(accessToken);
      return await this.fetchEmails(gmailService, action);
      
    } catch (error) {
      console.error('Error reading emails:', error);
      return {
        success: false,
        emails: [],
        count: 0,
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      };
    }
  }

  private async fetchEmails(gmailService: GmailFetchService, action: EmailReadAction): Promise<EmailReadResult> {
    try {
      // Determina il numero di email da leggere
      const count = action.count || 5;
      const maxCount = Math.min(count, 20); // Limita a 20 email max
      
      // Costruisci query Gmail API
      let query = '';
      
      switch (action.type) {
        case 'unread':
          query = 'is:unread';
          break;
        case 'today':
          query = 'after:' + this.getTodayDate();
          break;
        case 'week':
          query = 'after:' + this.getWeekAgoDate();
          break;
        case 'search':
          query = action.query || '';
          break;
        default:
          query = ''; // latest - tutte le email
      }
      
      // Aggiungi filtri
      if (action.filter === 'received') {
        query += query ? ' AND ' : '';
        query += 'to:me';  // Email RICEVUTE (destinate a me)
      } else if (action.filter === 'sent') {
        query += query ? ' AND ' : '';
        query += 'from:me';  // Email INVIATE (da me)
      }
      
      // Ottieni messaggi con query
      const messages = await gmailService.getMessagesWithQuery(maxCount, query);
      
      if (!messages || messages.length === 0) {
        return {
          success: true,
          emails: [],
          count: 0
        };
      }
      
      // Ottieni dettagli per ogni messaggio
      const emailDetails = [];
      for (const msg of messages.slice(0, maxCount)) {
        const detail = await gmailService.getMessage(msg.id);
        emailDetails.push(detail);
      }
      
      return {
        success: true,
        emails: emailDetails,
        count: emailDetails.length
      };
      
    } catch (error) {
      console.error('Error fetching email details:', error);
      return {
        success: false,
        emails: [],
        count: 0,
        error: error instanceof Error ? error.message : 'Errore nel recupero email'
      };
    }
  }

  private getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  private getWeekAgoDate(): string {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return weekAgo.toISOString().split('T')[0];
  }
}

// Singleton instance
export const emailReadService = new EmailReadService();

import { GmailFetchService } from './gmailFetchService';

export interface EmailManagementAction {
  action: 'email-manage';
  operation: 'mark-read' | 'mark-unread' | 'delete' | 'archive' | 'move-to-trash';
  target: 'latest' | 'specific' | 'search';
  emailId?: string;
  query?: string;
}

export interface EmailSearchAction {
  action: 'email-search';
  query: string;
  count?: number;
  filter?: 'has-attachment' | 'important' | 'unread' | 'sent' | 'received';
}

export class EmailManagementService {
  private getAccessToken(): string | null {
    try {
      const userData = localStorage.getItem('nyra_user');
      const userId = userData ? JSON.parse(userData).email : null;
      
      if (!userId) return null;
      
      const storedTokens = localStorage.getItem(`nyra_oauth_${userId}`);
      
      if (storedTokens) {
        const tokens = JSON.parse(storedTokens);
        const expiresAt = new Date(tokens.expires_at);
        const now = new Date();
        
        if (expiresAt > now) {
          return tokens.access_token;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  async manageEmail(action: EmailManagementAction): Promise<{ success: boolean; message: string }> {
    try {
      const accessToken = this.getAccessToken();
      
      if (!accessToken) {
        return { success: false, message: 'Token di accesso non disponibile' };
      }

      const gmailService = new GmailFetchService(accessToken);
      
      switch (action.operation) {
        case 'mark-read':
          return await this.markAsRead(gmailService, action);
        case 'mark-unread':
          return await this.markAsUnread(gmailService, action);
        case 'delete':
        case 'move-to-trash':
          return await this.moveToTrash(gmailService, action);
        case 'archive':
          return await this.archiveEmail(gmailService, action);
        default:
          return { success: false, message: 'Operazione non supportata' };
      }
    } catch (error) {
      console.error('Error managing email:', error);
      return { success: false, message: 'Errore nella gestione email' };
    }
  }

  async searchEmails(action: EmailSearchAction): Promise<{ success: boolean; emails: any[]; count: number; error?: string }> {
    try {
      const accessToken = this.getAccessToken();
      
      if (!accessToken) {
        return { success: false, emails: [], count: 0, error: 'Token di accesso non disponibile' };
      }

      const gmailService = new GmailFetchService(accessToken);
      
      // Costruisci query Gmail
      let query = action.query;
      
      if (action.filter) {
        switch (action.filter) {
          case 'has-attachment':
            query += query ? ' AND ' : '';
            query += 'has:attachment';
            break;
          case 'important':
            query += query ? ' AND ' : '';
            query += 'is:important';
            break;
          case 'unread':
            query += query ? ' AND ' : '';
            query += 'is:unread';
            break;
          case 'sent':
            query += query ? ' AND ' : '';
            query += 'from:me';  // Email INVIATE (da me)
            break;
          case 'received':
            query += query ? ' AND ' : '';
            query += 'to:me';  // Email RICEVUTE (destinate a me)
            break;
        }
      }

      const count = action.count || 10;
      const messages = await gmailService.getMessagesWithQuery(count, query);
      
      if (!messages || messages.length === 0) {
        return { success: true, emails: [], count: 0 };
      }

      // Ottieni dettagli per ogni messaggio
      const emailDetails = [];
      for (const msg of messages) {
        const detail = await gmailService.getMessage(msg.id);
        emailDetails.push(detail);
      }

      return {
        success: true,
        emails: emailDetails,
        count: emailDetails.length
      };

    } catch (error) {
      console.error('Error searching emails:', error);
      return { success: false, emails: [], count: 0, error: error instanceof Error ? error.message : 'Errore nella ricerca' };
    }
  }

  private async markAsRead(gmailService: GmailFetchService, action: EmailManagementAction): Promise<{ success: boolean; message: string }> {
    try {
      const messageId = await this.getTargetMessageId(gmailService, action);
      
      if (!messageId) {
        return { success: false, message: 'Email non trovata' };
      }

      // Rimuovi label UNREAD
      await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          removeLabelIds: ['UNREAD']
        })
      });

      return { success: true, message: 'Email marcata come letta' };
    } catch (error) {
      console.error('Error marking as read:', error);
      return { success: false, message: 'Errore nel marcare come letta' };
    }
  }

  private async markAsUnread(gmailService: GmailFetchService, action: EmailManagementAction): Promise<{ success: boolean; message: string }> {
    try {
      const messageId = await this.getTargetMessageId(gmailService, action);
      
      if (!messageId) {
        return { success: false, message: 'Email non trovata' };
      }

      // Aggiungi label UNREAD
      await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          addLabelIds: ['UNREAD']
        })
      });

      return { success: true, message: 'Email marcata come non letta' };
    } catch (error) {
      console.error('Error marking as unread:', error);
      return { success: false, message: 'Errore nel marcare come non letta' };
    }
  }

  private async moveToTrash(gmailService: GmailFetchService, action: EmailManagementAction): Promise<{ success: boolean; message: string }> {
    try {
      const messageId = await this.getTargetMessageId(gmailService, action);
      
      if (!messageId) {
        return { success: false, message: 'Email non trovata' };
      }

      // Sposta nel cestino
      await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`
        }
      });

      return { success: true, message: 'Email spostata nel cestino' };
    } catch (error) {
      console.error('Error moving to trash:', error);
      return { success: false, message: 'Errore nello spostare nel cestino' };
    }
  }

  private async archiveEmail(gmailService: GmailFetchService, action: EmailManagementAction): Promise<{ success: boolean; message: string }> {
    try {
      const messageId = await this.getTargetMessageId(gmailService, action);
      
      if (!messageId) {
        return { success: false, message: 'Email non trovata' };
      }

      // Archivia email (rimuove da INBOX)
      await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          removeLabelIds: ['INBOX']
        })
      });

      return { success: true, message: 'Email archiviata' };
    } catch (error) {
      console.error('Error archiving email:', error);
      return { success: false, message: 'Errore nell\'archiviare email' };
    }
  }

  private async getTargetMessageId(gmailService: GmailFetchService, action: EmailManagementAction): Promise<string | null> {
    if (action.emailId) {
      return action.emailId;
    }

    if (action.target === 'latest') {
      const messages = await gmailService.getMessages(1);
      return messages.length > 0 ? messages[0].id : null;
    }

    if (action.target === 'search' && action.query) {
      const messages = await gmailService.getMessagesWithQuery(1, action.query);
      return messages.length > 0 ? messages[0].id : null;
    }

    return null;
  }
}

// Singleton instance
export const emailManagementService = new EmailManagementService();

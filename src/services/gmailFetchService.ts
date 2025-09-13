import { getGmailUrl } from '../config/external-apis';

export class GmailFetchService {
  private accessToken: string;
  
  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getMessages(maxResults = 10) {
    return this.getMessagesWithQuery(maxResults, '');
  }

  async getMessagesWithQuery(maxResults = 10, query = '') {
    try {
      const url = new URL(getGmailUrl('/users/me/messages'));
      url.searchParams.set('maxResults', maxResults.toString());
      
      if (query) {
        url.searchParams.set('q', query);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.status}`);
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Error fetching Gmail:', error);
      return [];
    }
  }

  async getMessage(messageId: string) {
    const response = await fetch(
      `${getGmailUrl('/users/me/messages')}/${messageId}?format=full`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    const message = await response.json();
    const headers = message.payload.headers;
    
    // Estrai il contenuto completo dell'email
    let body = '';
    if (message.payload.body && message.payload.body.data) {
      body = atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    } else if (message.payload.parts) {
      // Cerca la parte text/plain o text/html
      const textPart = message.payload.parts.find(part => 
        part.mimeType === 'text/plain' || part.mimeType === 'text/html'
      );
      if (textPart && textPart.body && textPart.body.data) {
        body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }
    }
    
    return {
      id: message.id,
      subject: headers.find(h => h.name === 'Subject')?.value || '',
      from: headers.find(h => h.name === 'From')?.value || '',
      date: headers.find(h => h.name === 'Date')?.value || '',
      snippet: message.snippet,
      body: body || message.snippet // Fallback al snippet se non riesce a estrarre il body
    };
  }
}

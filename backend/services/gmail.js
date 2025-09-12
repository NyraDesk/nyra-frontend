const fetch = require('node-fetch');

class GmailService {
  async sendEmail(emailData, accessToken) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Gmail: Token status:', accessToken ? 'found' : 'not found');
      }

      if (!accessToken) {
        throw new Error('Token Gmail non trovato. Effettua il login con Google.');
      }

      // Format email according to RFC 2822
      const emailContent = [
        `To: ${emailData.email || emailData.to}`,
        `Subject: ${emailData.subject || 'Messaggio da NYRA'}`,
        '',
        emailData.body || emailData.suggestedBody || ''
      ].join('\r\n');

      // Encode in base64 URL-safe
      const encodedEmail = Buffer.from(emailContent)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send via Gmail API
      const response = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ raw: encodedEmail })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('Errore Gmail API:', error);
        throw new Error(`Invio email fallito: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Email inviata via Gmail:', result);
      return result;
    } catch (error) {
      console.error('Gmail send error:', error);
      throw error;
    }
  }

  async getMessages(accessToken, maxResults = 10) {
    try {
      const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
      url.searchParams.set('maxResults', maxResults.toString());

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.status}`);
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Error fetching Gmail messages:', error);
      return [];
    }
  }

  async getMessage(accessToken, messageId) {
    try {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.status}`);
      }

      const message = await response.json();
      const headers = message.payload.headers;
      
      // Extract email content
      let body = '';
      if (message.payload.body && message.payload.body.data) {
        body = Buffer.from(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
      } else if (message.payload.parts) {
        const textPart = message.payload.parts.find(part => 
          part.mimeType === 'text/plain' || part.mimeType === 'text/html'
        );
        if (textPart && textPart.body && textPart.body.data) {
          body = Buffer.from(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
        }
      }
      
      return {
        id: message.id,
        subject: headers.find(h => h.name === 'Subject')?.value || '',
        from: headers.find(h => h.name === 'From')?.value || '',
        date: headers.find(h => h.name === 'Date')?.value || '',
        snippet: message.snippet,
        body: body || message.snippet
      };
    } catch (error) {
      console.error('Error fetching Gmail message:', error);
      throw error;
    }
  }
}

module.exports = new GmailService();

import { getGmailUrl } from '../config/external-apis';

export const gmailDirectService = {
  async sendEmail(emailData: any) {
    // Recupera il token OAuth di Gmail
    // Prova tutti i possibili nomi del token
    const token = 
      localStorage.getItem('access_token') ||
      localStorage.getItem('gmail_access_token') ||
      localStorage.getItem('google_access_token');

    if (process.env.NODE_ENV === 'development') {
      console.log('Gmail: Token status:', token ? 'found' : 'not found');
    }

    if (!token) {
      throw new Error('Token Gmail non trovato. Effettua il login con Google.');
    }

    // Formatta l'email secondo RFC 2822
    const emailContent = [
      `To: ${emailData.email || emailData.to}`,
      `Subject: ${emailData.subject || 'Messaggio da NYRA'}`,
      '',
      emailData.body || emailData.suggestedBody || ''
    ].join('\r\n');

    // Codifica in base64 URL-safe
    const encodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Invia tramite Gmail API
    const response = await fetch(
      getGmailUrl('/users/me/messages/send'),
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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
  }
};

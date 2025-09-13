import { useState } from 'react';
import { GmailFetchService } from '../services/gmailFetchService';

import { API_URL } from '../config/api';

// Configurazione broker (stesso metodo di Settings.tsx)
const BROKER = (import.meta as any).env?.VITE_BROKER_URL || API_URL;

interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

export function GmailChecker() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);

  const checkEmails = async () => {
    setLoading(true);
    
    try {
      // Prendi userId (stesso metodo di Settings.tsx)
      const userData = localStorage.getItem('nyra_user');
      console.log('[GmailChecker] User data from localStorage:', userData);
      const userId = userData ? JSON.parse(userData).email : null;
      console.log('[GmailChecker] Extracted userId:', userId);
      
      if (!userId) {
        console.log('[GmailChecker] Cannot check emails: no email available');
        alert('Please connect Google first!');
        setLoading(false);
        return;
      }
      
      console.log(`[GmailChecker] Checking emails for user: ${userId}`);
      
      // Prima controlla localStorage per token salvati (stesso metodo di Settings.tsx)
      const storedTokens = localStorage.getItem(`nyra_oauth_${userId}`);
      let accessToken = null;
      
      if (storedTokens) {
        try {
          const tokens = JSON.parse(storedTokens);
          const expiresAt = new Date(tokens.expires_at);
          const now = new Date();
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[GmailChecker] Found stored tokens');
            console.log('[GmailChecker] - expires_at:', tokens.expires_at);
          }
          console.log(`[GmailChecker] - now: ${now.toISOString()}`);
          console.log(`[GmailChecker] - isExpired: ${expiresAt <= now}`);
          
          if (expiresAt > now) {
            // Token ancora validi
            if (process.env.NODE_ENV === 'development') {
              console.log('[GmailChecker] Using stored tokens - still valid');
            }
            accessToken = tokens.access_token;
          } else {
            // Token scaduti, rimuovili
            if (process.env.NODE_ENV === 'development') {
              console.log('[GmailChecker] Stored tokens expired, removing');
            }
            localStorage.removeItem(`nyra_oauth_${userId}`);
          }
        } catch (e) {
          console.warn('[GmailChecker] Error parsing stored tokens, removing');
          localStorage.removeItem(`nyra_oauth_${userId}`);
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('[GmailChecker] No stored tokens found');
        }
      }
      
      // Se non abbiamo token validi, prova il broker
      if (!accessToken) {
        const url = `${BROKER}/auth/google/status?user_id=${encodeURIComponent(userId)}`;
        console.log('[GmailChecker] Calling broker status endpoint:', url);
        const response = await fetch(url, { credentials: 'include' });
        
        if (!response.ok) {
          console.warn('[GmailChecker] Broker status request failed:', response.status);
          alert('Please connect Google first!');
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        console.log('[GmailChecker] Broker status response:', data);
        
        if (data?.gmail?.connected && data?.gmail?.access_token) {
          accessToken = data.gmail.access_token;
          if (process.env.NODE_ENV === 'development') {
            console.log('[GmailChecker] Using broker tokens');
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('[GmailChecker] No valid tokens from broker');
          }
          alert('Please connect Google first!');
          setLoading(false);
          return;
        }
      }
      
      // Usa i token per chiamare Gmail API
      const gmailService = new GmailFetchService(accessToken);
      
      const messages = await gmailService.getMessages(5);
      console.log('[GmailChecker] Messages fetched:', messages);
      
      const emailDetails = [];
      for (const msg of messages) {
        const detail = await gmailService.getMessage(msg.id);
        emailDetails.push(detail);
      }
      
      setEmails(emailDetails);
      console.log('[GmailChecker] Email details:', emailDetails);
      
    } catch (error) {
      console.error('[GmailChecker] Error checking emails:', error);
      alert('Error fetching emails. Check console.');
    }
    
    setLoading(false);
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-4">Gmail Inbox</h3>
      
      <button 
        onClick={checkEmails} 
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? 'Loading...' : 'Check Emails'}
      </button>
      
      <div className="mt-4 space-y-2">
        {emails.map(email => (
          <div key={email.id} className="p-3 border rounded">
            <strong>{email.subject}</strong>
            <p className="text-sm text-gray-600">From: {email.from}</p>
            <p className="text-sm">{email.snippet}</p>
            <small className="text-xs text-gray-500">{email.date}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

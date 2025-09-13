// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { API_URL } from '../config/api';
import { ArrowLeft, CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';
import { GmailChecker } from './GmailChecker';

interface UserData {
  username: string;
  email: string;
  password: string;
  name: string;
  language: string;
  timestamp: string;
}

interface SettingsProps {
  onClose?: () => void;
  onSubscriptionManagement: () => void;
  currentUser: UserData | null;
}

const Settings: React.FC<SettingsProps> = ({ onClose, onSubscriptionManagement, currentUser }) => {
  const [windsurf, setWindsurf] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [avatar, setAvatar] = useState(false);
  const [aiModel, setAiModel] = useState('gpt');

  // Broker HTTP configuration
  const BROKER = (import.meta as any).env?.VITE_BROKER_URL || API_URL;
  
  // Current user id - ENFORCE email only for OAuth (unique and persistent identifier)
  const userId = currentUser?.email;
  
  // Google integrations state
  const [gStatus, setGStatus] = useState<{ gmail?: boolean; gcal?: boolean }>({});
  const [loading, setLoading] = useState(false);

  // Google status refresh function
  async function refreshGoogleStatus() {
    // Early return if no email available
    if (!userId) {
      console.log('[FRONTEND] Cannot refresh Google status: no email available');
      return;
    }

    try {
      setLoading(true);
      console.log(`[FRONTEND] Refreshing Google status for user: ${userId}`);
      
      // First check localStorage for stored tokens
      const storedTokens = localStorage.getItem(`nyra_oauth_${userId}`);
      if (storedTokens) {
        try {
          const tokens = JSON.parse(storedTokens);
          const expiresAt = new Date(tokens.expires_at);
          const now = new Date();
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[FRONTEND] Found stored tokens');
            console.log('[FRONTEND] - expires_at:', tokens.expires_at);
          }
          console.log(`[FRONTEND] - now: ${now.toISOString()}`);
          console.log(`[FRONTEND] - isExpired: ${expiresAt <= now}`);
          
          if (expiresAt > now) {
            // Tokens are still valid, update UI
            if (process.env.NODE_ENV === 'development') {
              console.log('[FRONTEND] Using stored tokens - still valid');
            }
            setGStatus({ gmail: true, gcal: true });
            setLoading(false);
            return;
          } else {
            // Tokens expired, remove them
            if (process.env.NODE_ENV === 'development') {
              console.log('[FRONTEND] Stored tokens expired, removing');
            }
            localStorage.removeItem(`nyra_oauth_${userId}`);
          }
        } catch (e) {
          console.warn('[FRONTEND] Error parsing stored tokens, removing');
          localStorage.removeItem(`nyra_oauth_${userId}`);
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('[FRONTEND] No stored tokens found');
        }
      }
      
      // Fallback to broker status check
      const url = `${BROKER}/auth/google/status?user_id=${encodeURIComponent(userId)}`;
      console.log('[FRONTEND] Calling broker status endpoint:', url);
      const r = await fetch(url, { credentials: 'include' });
      if (!r.ok) {
        console.warn('[FRONTEND] Broker status request failed:', r.status);
        return;
      }

      const j = await r.json();
      console.log('[FRONTEND] Broker status response:', j);
      
      const newStatus = {
        gmail: !!j?.gmail?.connected,
        gcal: !!j?.gcal?.connected,
      };
      
      console.log('[FRONTEND] Setting new status:', newStatus);
      setGStatus(newStatus);
    } catch (err) {
      console.warn('[FRONTEND] Status refresh error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Google OAuth connection function
  async function connectGoogleWorkspace() {
    // CRITICAL: Early return if no email available
    if (!userId) {
      console.warn('[OAuth] Cannot start OAuth flow: no email available');
      return;
    }

    try {
      setLoading(true);
      const startUrl = `${BROKER}/auth/google/start?user_id=${encodeURIComponent(userId)}`;
      console.log('[OAuth] start →', startUrl);

      const r = await fetch(startUrl);
      if (!r.ok) throw new Error(`start failed: ${r.status}`);
      const j = await r.json();
      if (!j?.auth_url) throw new Error('Missing auth_url in response');

      // open Google consent page
      const popup = window.open(j.auth_url, 'nyra_google_oauth', 'width=520,height=680');
      console.log('[OAuth] opened popup');

      // Listen for OAuth messages from popup
      const messageHandler = (event: MessageEvent) => {
        if (event.data?.type === 'nyra:google:connected') {
          console.log('[FRONTEND] Received OAuth success message:', event.data);
          
          // Store tokens in localStorage
          const tokens = event.data.tokens;
          if (process.env.NODE_ENV === 'development') {
            console.log('[FRONTEND] Storing tokens in localStorage');
            console.log('[FRONTEND] - access_token:', tokens.access_token ? 'present' : 'null');
            console.log('[FRONTEND] - refresh_token:', tokens.refresh_token ? 'present' : 'null');
            console.log('[FRONTEND] - expires_at:', tokens.expires_at);
            console.log('[FRONTEND] - scope:', tokens.scope);
          }
          
          // Salva con chiavi semplici per Gmail Direct Service
          localStorage.setItem('access_token', tokens.access_token);
          localStorage.setItem('refresh_token', tokens.refresh_token);
          
          localStorage.setItem(`nyra_oauth_${userId}`, JSON.stringify({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expires_at,
            scope: tokens.scope,
            user_id: event.data.user_id
          }));

          // Update UI status
          console.log('[FRONTEND] Updating UI status to connected');
          setGStatus({ gmail: true, gcal: true });
          setLoading(false);
          
          // Close popup
          if (popup && !popup.closed) popup.close();
          
          // Remove message listener
          window.removeEventListener('message', messageHandler);
        } else if (event.data?.type === 'nyra:google:error') {
          console.error('[FRONTEND] Received OAuth error message:', event.data.error);
          setLoading(false);
          
          // Close popup
          if (popup && !popup.closed) popup.close();
          
          // Remove message listener
          window.removeEventListener('message', messageHandler);
        }
      };

      // Add message listener
      window.addEventListener('message', messageHandler);
      
      // Cleanup listener after 5 minutes (timeout)
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        if (popup && !popup.closed) {
          popup.close();
        }
        setLoading(false);
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error('[OAuth] Error starting OAuth flow:', error);
      setLoading(false);
    }
  }

  // Load Google status on component mount
  useEffect(() => {
    refreshGoogleStatus();
  }, [userId]); // Re-run when userId changes

  // Escape key handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Toggle component
  const Toggle = ({ enabled, onChange, label }: { enabled: boolean; onChange: (enabled: boolean) => void; label: string }) => (
    <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#161B22' }}>
      <span className="font-mono text-sm" style={{ color: '#C9D1D9' }}>{label}</span>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
          enabled ? 'bg-green-600' : 'bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative w-[92vw] max-w-[820px] rounded-2xl bg-[#2a2d33] border border-white/10 shadow-xl
                   max-h-[82vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header with close */}
        <div className="sticky top-0 z-10 bg-[#2a2d33]/95 backdrop-blur p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button
            type="button"
            aria-label="Chiudi"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 active:bg-white/15"
          >
            ×
          </button>
        </div>

        {/* Body container – existing Settings content */}
        <div className="p-4 md:p-6 space-y-6">
          {/* Toggles Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-mono font-semibold mb-4" style={{ color: '#C9D1D9' }}>
              Preferenze
            </h2>
            
            <Toggle
              enabled={windsurf}
              onChange={setWindsurf}
              label="Windsurf"
            />
            
            <Toggle
              enabled={notifications}
              onChange={setNotifications}
              label="Notifiche"
            />
            
            <Toggle
              enabled={avatar}
              onChange={setAvatar}
              label="Avatar"
            />
          </div>

          {/* Integrazioni Section */}
          <div className="space-y-3">
            <h3 className="text-base md:text-lg font-semibold text-white border-b border-white/10 pb-2">
              Integrazioni
            </h3>

            <div className="bg-white/10 border border-white/5 rounded-2xl p-4 md:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/80">
                  <span className="font-medium">Gmail</span>{' '}
                  <span className={gStatus.gmail ? 'text-green-400' : 'text-amber-300'}>
                    {loading ? 'Verifica…' : gStatus.gmail ? 'Connesso' : 'Non connesso'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-white/80">
                  <span className="font-medium">Google Calendar</span>{' '}
                  <span className={gStatus.gcal ? 'text-green-400' : 'text-amber-300'}>
                    {loading ? 'Verifica…' : gStatus.gcal ? 'Connesso' : 'Non connesso'}
                  </span>
                </div>

                <button
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                    userId 
                      ? 'text-white bg-green-600 hover:bg-green-700 active:bg-green-800' 
                      : 'text-gray-400 bg-gray-600 cursor-not-allowed'
                  }`}
                  onClick={connectGoogleWorkspace}
                  disabled={!userId}
                  title={userId ? 'Connetti Google Workspace' : 'Effettua il login con email per collegare Google'}
                >
                  Connetti Google Workspace
                </button>
              </div>

              <p className="text-xs text-white/60 pt-1">
                {userId 
                  ? 'Un solo consenso abilita Gmail e Calendar.'
                  : 'Effettua il login con email per collegare Google Workspace.'
                }
              </p>
            </div>
          </div>

          {/* Gmail Checker */}
          <div className="space-y-4">
            <h2 className="text-lg font-mono font-semibold mb-4" style={{ color: '#C9D1D9' }}>
              📧 Gmail Checker
            </h2>
            
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#161B22' }}>
              <GmailChecker />
            </div>
          </div>



          {/* AI Model Selection */}
          <div className="space-y-4">
            <h2 className="text-lg font-mono font-semibold mb-4" style={{ color: '#C9D1D9' }}>
              Modello AI
            </h2>
            
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#161B22' }}>
              <label className="block font-mono text-sm mb-2" style={{ color: '#C9D1D9' }}>
                Seleziona modello
              </label>
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full p-3 rounded-lg font-mono text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                style={{ 
                  backgroundColor: '#21262D', 
                  color: '#C9D1D9'
                }}
              >
                <option value="gpt">GPT-4</option>
                <option value="claude">Claude Sonnet</option>
                <option value="gemini">Gemini Pro</option>
              </select>
            </div>
          </div>

          {/* Subscription Management */}
          <div className="space-y-4">
            <h2 className="text-lg font-mono font-semibold mb-4" style={{ color: '#C9D1D9' }}>
              Account
            </h2>
            
            {/* User Info */}
            {currentUser ? (
              <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: '#161B22' }}>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-mono text-sm" style={{ color: '#8B949E' }}>Username:</span>
                    <span className="font-mono text-sm" style={{ color: '#C9D1D9' }}>{currentUser.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-sm" style={{ color: '#8B949E' }}>Email:</span>
                    <span className="font-mono text-sm" style={{ color: '#C9D1D9' }}>{currentUser.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-sm" style={{ color: '#8B949E' }}>Member since:</span>
                    <span className="font-mono text-sm" style={{ color: '#C9D1D9' }}>
                      {new Date(currentUser.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg mb-4 text-center" style={{ backgroundColor: '#161B22', color: '#C9D1D9' }}>
                Nessun utente disponibile
              </div>
            )}
            
            <h3 className="text-md font-mono font-semibold mb-4" style={{ color: '#C9D1D9' }}>
              Abbonamento
            </h3>
            
            <button
              onClick={onSubscriptionManagement}
              className="w-full flex items-center justify-between p-4 rounded-lg transition-all duration-200 hover:bg-gray-800"
              style={{ backgroundColor: '#161B22' }}
            >
              <div className="flex items-center gap-3">
                <CreditCard size={20} style={{ color: '#3FB950' }} />
                <span className="font-mono text-sm" style={{ color: '#C9D1D9' }}>
                  Gestione abbonamento
                </span>
              </div>
              <span className="font-mono text-xs" style={{ color: '#8B949E' }}>
                Piano Standard
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
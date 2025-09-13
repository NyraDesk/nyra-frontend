import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon } from 'lucide-react';
import { API_URL } from '../config/api';

interface SettingsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  onLanguageChange: (language: string) => void;
  theme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  currentUser?: {
    username: string;
    email: string;
    name: string;
  } | null;
}

export default function SettingsOverlay({ isOpen, onClose, language, onLanguageChange, theme, onThemeChange, currentUser }: SettingsOverlayProps) {
  const [showPlanDetails, setShowPlanDetails] = useState(false);

  // OAuth Broker configuration
  const BROKER = (import.meta as any).env?.VITE_BROKER_URL || API_URL;

  // Google Integrations Section Component
  function GoogleIntegrationsSection({ userId }: { userId: string }) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ gmail?: boolean; gcal?: boolean }>({});

    async function refresh() {
      setLoading(true);
      try {
        const r = await fetch(`${BROKER}/auth/google/status?userId=${encodeURIComponent(userId)}`, { credentials: "include" });
        if (r.ok) {
          const j = await r.json();
          setStatus({ gmail: !!j.gmail?.connected, gcal: !!j.gcal?.connected });
        }
      } finally { setLoading(false); }
    }

    function connectWorkspace() {
      const url = `${BROKER}/auth/google/start?userId=${encodeURIComponent(userId)}`;
      const w = window.open(url, "nyra_google_oauth", "width=520,height=680");
      const onMsg = (e: MessageEvent) => {
        if (e.data === "nyra:google:connected") {
          refresh();
          window.removeEventListener("message", onMsg);
          if (w && !w.closed) w.close();
        }
      };
      window.addEventListener("message", onMsg);
      setTimeout(() => { refresh(); window.removeEventListener("message", onMsg); if (w && !w.closed) w.close(); }, 10000);
    }

    useEffect(() => { refresh(); }, [userId]);

    return (
      <div className="space-y-3">
        <h3 className="text-base md:text-lg font-semibold text-white tracking-tight border-b border-white/10 pb-2">Integrazioni</h3>

        <div className="bg-white/10 border border-white/5 rounded-2xl p-4 md:p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-white/80">
              <span className="font-medium">Gmail</span>{" "}
              <span className={status.gmail ? "text-green-400" : "text-amber-300"}>
                {loading ? "Verifica..." : status.gmail ? "Connesso" : "Non connesso"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-white/80">
              <span className="font-medium">Google Calendar</span>{" "}
              <span className={status.gcal ? "text-green-400" : "text-amber-300"}>
                {loading ? "Verifica..." : status.gcal ? "Connesso" : "Non connesso"}
              </span>
            </div>

            <button
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-white bg-green-600 hover:bg-green-700 active:bg-green-800 transition-colors"
              onClick={connectWorkspace}
            >
              Connetti Google Workspace
            </button>
          </div>

          <p className="text-xs text-white/60 pt-2">
            Un solo consenso abilita Gmail e Calendar.
          </p>
        </div>
      </div>
    );
  }

  // Localization object
  const texts = {
    Italiano: {
      settings: "Impostazioni",
      accountPlan: "Account & Piano",
      name: "Nome:",
      email: "Email:",
      plan: "Piano:",
      premium: "Premium",
      planActive: "Piano Premium attivo",
      expires: "Scadenza: 15 Gen 2025",
      tokensAvailable: "Token disponibili: 45.2k / 50k",
      aiTokens: "Token AI:",
      available: "disponibili",
      running_out: "In esaurimento",
      planManagement: "Gestione Piano",
      changePlan: "Cambia piano",
      preferences: "Preferenze",
      language: "Lingua:",
      italian: "Italiano",
      english: "English",
      theme: "Tema:",
      system: "Sistema",
      light: "Chiaro",
      dark: "Scuro",
      sounds: "Suoni:",
      active: "Attivi",
      inactive: "Disattivi",
      avatar: "Avatar:",
      featureAvailableSoon: "Funzionalità disponibile a breve",
      notifications: "Notifiche",
      desktop: "Desktop:",
      reminders: "Reminder:",
      priority: "Priorità:",
      all: "Tutte",
      importantOnly: "Solo importanti",
      privacySecurity: "Privacy & Sicurezza",
      microphoneAccess: "Accesso microfono",
      calendarAccess: "Accesso calendario",
      fileSystemAccess: "Accesso file system",
      granted: "Concesso",
      dataBackup: "Backup dati:",
      localOnly: "Solo locale",
      cloud: "Cloud",
      nyraLearning: "Apprendimento NYRA:",
      automationsRoutines: "Automazioni & Routine",
      nyraLearningDesc: "Apprendimento NYRA:",
      quickCommands: "Comandi rapidi:",
      configurable: "Configurabili",
      proactiveSuggestions: "Suggerimenti proattivi:",
      supportInfo: "Supporto & Info",
      helpCenter: "Centro assistenza",
      open: "Apri",
      faqGuide: "FAQ e guida rapida",
      view: "Visualizza",
      sendFeedback: "Invia feedback",
      write: "Scrivi",
      appVersion: "Versione app",
      logout: "Logout",
      deleteAccount: "Elimina account"
    },
    English: {
      settings: "Settings",
      accountPlan: "Account & Plan",
      name: "Name:",
      email: "Email:",
      plan: "Plan:",
      premium: "Premium",
      planActive: "Premium Plan active",
      expires: "Expires: Jan 15, 2025",
      tokensAvailable: "Available tokens: 45.2k / 50k",
      aiTokens: "AI Tokens:",
      available: "available",
      running_out: "Running out",
      planManagement: "Plan Management",
      changePlan: "Change plan",
      preferences: "Preferences",
      language: "Language:",
      italian: "Italiano",
      english: "English",
      theme: "Theme:",
      system: "System",
      light: "Light",
      dark: "Dark",
      sounds: "Sounds:",
      active: "Active",
      inactive: "Inactive",
      avatar: "Avatar:",
      featureAvailableSoon: "Feature available soon",
      notifications: "Notifications",
      desktop: "Desktop:",
      reminders: "Reminders:",
      priority: "Priority:",
      all: "All",
      importantOnly: "Important only",
      privacySecurity: "Privacy & Security",
      microphoneAccess: "Microphone access",
      calendarAccess: "Calendar access",
      fileSystemAccess: "File system access",
      granted: "Granted",
      dataBackup: "Data backup:",
      localOnly: "Local only",
      cloud: "Cloud",
      nyraLearning: "NYRA learning:",
      automationsRoutines: "Automations & Routines",
      nyraLearningDesc: "NYRA learning:",
      quickCommands: "Quick commands:",
      configurable: "Configurable",
      proactiveSuggestions: "Proactive suggestions:",
      supportInfo: "Support & Info",
      helpCenter: "Help center",
      open: "Open",
      faqGuide: "FAQ and quick guide",
      view: "View",
      sendFeedback: "Send feedback",
      write: "Write",
      appVersion: "App version",
      logout: "Logout",
      deleteAccount: "Delete account"
    }
  };

  // Get current language texts
  const t = texts[language as keyof typeof texts] || texts.Italiano;

  const handleLanguageChange = (newLanguage: string) => {
    onLanguageChange(newLanguage);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center animate-in fade-in duration-300">
      <div 
        className="w-[500px] max-h-[80vh] rounded-2xl border border-white/10 shadow-xl relative z-[1000] animate-in fade-in-0 zoom-in-95 duration-300 overflow-hidden"
        style={{
          backgroundColor: 'rgba(20, 20, 20, 0.7)',
          backdropFilter: 'blur(16px)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <SettingsIcon 
              size={18} 
              className="text-white stroke-1"
            />
            <h2 className="text-lg font-medium text-white">
              {t.settings}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="group p-2 hover:bg-white/10 rounded-lg transition-colors duration-200"
          >
            <X 
              size={16} 
              className="text-white/70 group-hover:text-white transition-colors duration-200 stroke-1" 
            />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="px-6 pb-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          <div className="space-y-6">

          {/* 1. Account & Piano */}
          <div className="space-y-3">
            <h3 className="text-base md:text-lg font-semibold text-white tracking-tight border-b border-white/10 pb-2">
              {t.accountPlan}
            </h3>
            
            <div className="bg-white/10 border border-white/5 rounded-2xl p-4 md:p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/70 font-medium w-20">{t.name}</span>
                <span className="text-sm text-white font-medium">{currentUser?.name || currentUser?.username || 'Utente'}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/70 font-medium w-20">{t.email}</span>
                <span className="text-sm text-white font-medium">{currentUser?.email || 'email@example.com'}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/70 font-medium w-20">{t.plan}</span>
                <button 
                  onClick={() => setShowPlanDetails(!showPlanDetails)}
                  className="text-sm text-green-400 font-medium hover:text-green-300 transition-colors duration-200"
                >
                  {t.premium}
                </button>
              </div>
              
              {showPlanDetails && (
                <div className="bg-white/5 rounded-lg p-3 space-y-2">
                  <div className="text-xs text-white/60">{t.planActive}</div>
                  <div className="text-xs text-white/60">{t.expires}</div>
                  <div className="text-xs text-white/60">{t.tokensAvailable}</div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/70 font-medium w-20">{t.aiTokens}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-400 font-medium">134 {t.available}</span>
                  <span className="text-xs text-yellow-400">⚠ {t.running_out}</span>
                </div>
              </div>
              
              {/* Gestione Piano */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="text-sm text-white/70 font-medium mb-2">{t.planManagement}</div>
                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-all duration-200 border border-white/10">
                    {t.changePlan}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Preferenze */}
          <div className="space-y-3">
            <h3 className="text-base md:text-lg font-semibold text-white tracking-tight border-b border-white/10 pb-2">
              {t.preferences}
            </h3>
            
            <div className="bg-white/10 border border-white/5 rounded-2xl p-4 md:p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/70 font-medium w-24">{t.language}</span>
                <select 
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="text-sm text-white font-medium bg-white/10 border border-white/10 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-white/20 backdrop-blur-sm"
                >
                  <option value="Italiano" style={{ backgroundColor: '#2a2a2a', color: '#fff' }}>{t.italian}</option>
                  <option value="English" style={{ backgroundColor: '#2a2a2a', color: '#fff' }}>{t.english}</option>
                </select>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/70 font-medium w-24">{t.theme}</span>
                <select 
                  value={theme}
                  onChange={(e) => onThemeChange(e.target.value as 'light' | 'dark' | 'system')}
                  className="text-sm text-white font-medium bg-white/10 border border-white/10 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-white/20 backdrop-blur-sm"
                >
                  <option value="system" style={{ backgroundColor: '#2a2a2a', color: '#fff' }}>{t.system}</option>
                  <option value="light" style={{ backgroundColor: '#2a2a2a', color: '#fff' }}>{t.light}</option>
                  <option value="dark" style={{ backgroundColor: '#2a2a2a', color: '#fff' }}>{t.dark}</option>
                </select>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/70 font-medium w-24">{t.sounds}</span>
                <select className="text-sm text-white font-medium bg-white/10 border border-white/10 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-white/20 backdrop-blur-sm">
                  <option value="attivi" style={{ backgroundColor: '#2a2a2a', color: '#fff' }}>{t.active}</option>
                  <option value="disattivi" style={{ backgroundColor: '#2a2a2a', color: '#fff' }}>{t.inactive}</option>
                </select>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/70 font-medium w-24">{t.avatar}</span>
                <span className="text-sm text-white/50 font-medium">{t.featureAvailableSoon}</span>
              </div>
            </div>
          </div>

          {/* 3. Notifiche */}
          <div className="space-y-3">
            <h3 className="text-base md:text-lg font-semibold text-white tracking-tight border-b border-white/10 pb-2">
              {t.notifications}
            </h3>
            
            <div className="bg-white/10 border border-white/5 rounded-2xl p-4 md:p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/70 font-medium w-28">{t.desktop}</span>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="desktop-notifications" defaultChecked className="w-4 h-4 rounded border-white/20 bg-white/10 text-white focus:ring-white/20" />
                  <span className="text-sm text-white font-medium">{t.active}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/70 font-medium w-28">{t.reminders}</span>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="reminders" defaultChecked className="w-4 h-4 rounded border-white/20 bg-white/10 text-white focus:ring-white/20" />
                  <span className="text-sm text-white font-medium">{t.active}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/70 font-medium w-28">{t.priority}</span>
                <select className="text-sm text-white font-medium bg-white/10 border border-white/10 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-white/20 backdrop-blur-sm">
                  <option value="tutte" style={{ backgroundColor: '#2a2a2a', color: '#fff' }}>{t.all}</option>
                  <option value="importanti" style={{ backgroundColor: '#2a2a2a', color: '#fff' }}>{t.importantOnly}</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. Integrazioni */}
          {currentUser && (
            <GoogleIntegrationsSection userId={currentUser.email || currentUser.username} />
          )}

          {/* 5. Privacy & Sicurezza */}
          <div className="space-y-3">
            <h3 className="text-base md:text-lg font-semibold text-white tracking-tight border-b border-white/10 pb-2">
              {t.privacySecurity}
            </h3>
            
            <div className="bg-white/10 border border-white/5 rounded-2xl p-4 md:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white font-medium">{t.microphoneAccess}</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-green-400 font-medium">{t.granted}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-white font-medium">{t.calendarAccess}</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-green-400 font-medium">{t.granted}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-white font-medium">{t.fileSystemAccess}</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-green-400 font-medium">{t.granted}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/70 font-medium w-24">{t.dataBackup}</span>
                <select className="text-sm text-white font-medium bg-white/10 border border-white/10 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-white/20 backdrop-blur-sm">
                  <option value="locale" style={{ backgroundColor: '#2a2a2a', color: '#fff' }}>{t.localOnly}</option>
                  <option value="cloud" style={{ backgroundColor: '#2a2a2a', color: '#fff' }}>{t.cloud}</option>
                </select>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/70 font-medium w-32">{t.nyraLearning}</span>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="ai-learning" defaultChecked className="w-4 h-4 rounded border-white/20 bg-white/10 text-white focus:ring-white/20" />
                  <span className="text-sm text-white font-medium">{t.active}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Automazioni & Routine */}
          <div className="space-y-3">
            <h3 className="text-base md:text-lg font-semibold text-white tracking-tight border-b border-white/10 pb-2">
              {t.automationsRoutines}
            </h3>
            
            <div className="bg-white/10 border border-white/5 rounded-2xl p-4 md:p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/70 font-medium w-32">{t.nyraLearningDesc}</span>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="nyra-learning" defaultChecked className="w-4 h-4 rounded border-white/20 bg-white/10 text-white focus:ring-white/20" />
                  <span className="text-sm text-white font-medium">{t.active}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-white font-medium">{t.quickCommands}</span>
                <button className="text-sm text-white/70 hover:text-white transition-colors duration-200">
                  {t.configurable}
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/70 font-medium w-32">{t.proactiveSuggestions}</span>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="proactive-suggestions" defaultChecked className="w-4 h-4 rounded border-white/20 bg-white/10 text-white focus:ring-white/20" />
                  <span className="text-sm text-white font-medium">{t.active}</span>
                </div>
              </div>
            </div>
          </div>

          {/* [NYRA-INTEGRATIONS-START] */}
          <div className="space-y-3">
            <h3 className="text-base md:text-lg font-semibold text-white border-b border-white/10 pb-2">
              Integrazioni
            </h3>

            <div className="bg-white/10 border border-white/5 rounded-2xl p-4 md:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-white/80">
                  <span className="font-medium">Gmail</span>{" "}
                  <span className="text-amber-300">Non connesso</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-white/80">
                  <span className="font-medium">Google Calendar</span>{" "}
                  <span className="text-amber-300">Non connesso</span>
                </div>
                <button
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-white bg-green-600 hover:bg-green-700 active:bg-green-800 transition-colors"
                >
                  Connetti Google Workspace
                </button>
              </div>

              <p className="text-xs text-white/60 pt-1">
                Un solo consenso abilita Gmail e Calendar.
              </p>
            </div>
          </div>
          {/* [NYRA-INTEGRATIONS-END] */}

          {/* 7. Supporto & Info */}
          <div className="space-y-3">
            <h3 className="text-base md:text-lg font-semibold text-white tracking-tight border-b border-white/10 pb-2">
              {t.supportInfo}
            </h3>
            
            <div className="bg-white/10 border border-white/5 rounded-2xl p-4 md:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white font-medium">{t.helpCenter}</span>
                <button className="text-sm text-white/70 hover:text-white transition-colors duration-200">
                  {t.open}
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-white font-medium">{t.faqGuide}</span>
                <button className="text-sm text-white/70 hover:text-white transition-colors duration-200">
                  {t.view}
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-white font-medium">{t.sendFeedback}</span>
                <button className="text-sm text-white/70 hover:text-white transition-colors duration-200">
                  {t.write}
                </button>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-sm text-white font-medium">{t.appVersion}</span>
                <span className="text-sm text-white/70">Nyra Desktop 1.0.0</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50 font-medium">Svuota cache</span>
                <button className="text-sm text-white/70 hover:text-white transition-colors duration-200">
                  Svuota
                </button>
              </div>
            </div>
          </div>

          {/* Logout e Elimina Account - Separati in fondo */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <div className="bg-white/10 border border-white/5 rounded-2xl p-4 md:p-5 shadow-sm space-y-3">
              <button className="w-full py-3 bg-red-400/20 hover:bg-red-400/30 text-red-300 text-sm font-medium rounded-lg transition-all duration-200 border border-red-400/20">
                {t.logout}
              </button>
              
              <button className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/50 text-sm font-medium rounded-lg transition-all duration-200 border border-white/5">
                {t.deleteAccount}
              </button>
            </div>
          </div>

          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useRef, useEffect } from 'react';
import { EXTERNAL_APIS } from './config/external-apis';

// Estendi l'interfaccia Window per le proprietà personalizzate
declare global {
  interface Window {
    openRouterApiKey?: string;
    tempExcelData?: any;
    tempExcelFile?: File;
    tempEmailData?: any;
  }
}

import { electronBridge } from './services/electronBridge';
import Settings from './components/Settings';
import Toast from './components/Toast';
import { TypewriterMessage } from './components/TypewriterMessage';
import { useToast } from './hooks/useToast';
import { safeParseJSON, isCalendarAction, createN8NPayload } from './services/calendarActionHandler';
import { isEmailAction, createN8NEmailPayload, EmailAction } from './services/emailActionHandler';
import { getDynamicGreeting, getLocalTZ } from './services/time';
import { ExcelService, analyzeExcelForEmails } from './services/excelService';
import * as XLSX from 'xlsx';
import { EmailPreview } from './components/EmailPreview';
import {
  Plus, MessageSquare, Mic, Settings as SettingsIcon, User, Moon, Sun, Send,
  Mail, Calendar, FolderOpen, Globe, Menu, X, Clock, Eye, EyeOff,
  Power, PowerOff, MoreHorizontal, Check
} from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'thinking' | 'normal' | 'excel-analysis';
  status?: 'connecting' | 'processing' | 'local' | 'completed' | 'analyzing';
}

interface MessageComponentProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  isLoading?: boolean;
}

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: Date;
  isActive: boolean;
}

interface Action {
  id: string;
  description: string;
  timestamp: Date;
  conversationId: string;
  conversationTitle: string;
}

interface Task {
  id: number;
  action: string;
  timestamp: Date;
  status: 'completed' | 'pending';
}



interface UserData {
  email: string;
  username: string;
  password: string;
  name: string;
  language: string;
  timestamp: string;
}

  // Helper function per generare ID unici per i messaggi usando crypto.randomUUID()
  const getUniqueMessageId = () => crypto.randomUUID();

  // Funzione per rilevare se un messaggio contiene parole chiave per i reminder
  const detectReminderKeywords = (message: string): boolean => {
    const reminderKeywords = ['ricorda', 'reminder', 'meeting'];
    
    const lowerMessage = message.toLowerCase();
    const hasKeyword = reminderKeywords.some(keyword => lowerMessage.includes(keyword));
    
    return hasKeyword;
  };

// ThinkingDots component moved outside App to prevent unnecessary re-renders
const ThinkingDots = React.memo(() => {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return <span className="thinking-dots-animation">Nyra is thinking{dots}</span>;
});

ThinkingDots.displayName = 'ThinkingDots';

// Message component moved outside App to prevent unnecessary re-renders
const Message: React.FC<MessageComponentProps> = React.memo(({ role, content, timestamp, isLoading }) => {
  const isUser = role === 'user';
  
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  return (
    <div className={`message ${isUser ? 'user' : 'ai'}`}>
      <div className={`message-content ${isLoading ? 'thinking-message' : ''}`}>
        {isLoading ? (
          <ThinkingDots />
        ) : (
          <span>{content}</span>
        )}
      </div>
      {!isLoading && timestamp && (
        <div className="message-time">
          {formatTime(timestamp)}
        </div>
      )}
    </div>
  );
});

Message.displayName = 'Message';

function App() {

  
      // DEBOUNCE REF per evitare chiamate eccessive
    const adjustHeightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Cleanup timeout al dismount
    useEffect(() => {
      return () => {
        if (adjustHeightTimeoutRef.current) {
          clearTimeout(adjustHeightTimeoutRef.current);
        }
      };
    }, []);
    
    // Log di boot time per debug date
    useEffect(() => {
      const logBootTime = async () => {
        try {
          const { getNow } = await import('./services/clock');
          const { getLocalTZ, now, formatDateIT, formatTimeIT, partOfDay } = await import('./services/time');
          
          const clockNow = getNow();
          setAppClock({ now: clockNow.now.toISOString(), tz: clockNow.tz });
          
          const tz = getLocalTZ();
          const currentNow = now(tz);
          const todayHuman = formatDateIT(currentNow, tz);
          const currentTime = formatTimeIT(currentNow, tz);
          const currentPartOfDay = partOfDay(currentNow, tz);
          
          // Imposta gli stati per il saluto dinamico
          setParteDelGiorno(currentPartOfDay);
          setDataFormattata(todayHuman);
          setOraFormattata(currentTime);
          
          console.log('[BOOT TIME]', {
            tz: tz,
            nowISO: currentNow.toISOString(),
            todayHuman: todayHuman,
            parteDelGiorno: currentPartOfDay,
            ora: currentTime
          });
          
          // Log aggiuntivo per debug data corrente
          const currentDate = new Date();
          console.log('[NYRA SYSTEM] Current date:', currentDate.toLocaleDateString('it-IT', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          }));
        } catch (error) {
          console.warn('[BOOT TIME] Errore nel caricamento clock service:', error);
        }
      };
      logBootTime();
    }, []);
  const [showWelcome, setShowWelcomeScreen] = useState(() => {
    // Check if user session exists AND if user selected "Resta collegato"
    const savedUser = localStorage.getItem('nyra_user');
    const stayConnectedFlag = localStorage.getItem('nyra_stay_connected');
    
    // Logica robusta per mostrare welcome screen
    // Mostra welcome screen se:
    // 1. Nessun utente salvato, OR
    // 2. Utente esiste ma non ha selezionato "Resta collegato"
    
    if (!savedUser) {
      return true;
    }
    
    if (stayConnectedFlag !== 'true') {
      // Utente esiste ma non ha selezionato "Resta collegato", pulisci sessione
      localStorage.removeItem('nyra_user');
      return true;
    }
    
    // Utente ha sessione valida E ha selezionato "Resta collegato"
    return false;
  });
  const [isLogin, setIsLogin] = useState(true);
  const [registrationData, setRegistrationData] = useState({
    email: '',
    username: '',
    password: '',
    name: '',
    language: 'Italiano'
  });
  const [showPassword, setShowPasswordVisible] = useState(false);
  const [stayConnected, setStayConnected] = useState(false);
  
  // Logica corretta per showWelcome
  const shouldShowWelcome = showWelcome;
  // TODO: Reactivate if selectedLanguage is needed separately from language
  // const [selectedLanguage, setSelectedLanguage] = useState('Italiano');

  
  // Language state with persistence
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('nyra_language');
    return savedLanguage || 'Italiano';
  });
  
  // Theme state with persistence and system detection
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const savedTheme = localStorage.getItem('nyra_theme');
    return (savedTheme as 'light' | 'dark' | 'system') || 'system';
  });
  
  const [currentUser, setCurrentUser] = useState<UserData | null>(() => {
    // Check for existing session AND "Resta collegato" flag on app initialization
    const savedUser = localStorage.getItem('nyra_user');
    const stayConnectedFlag = localStorage.getItem('nyra_stay_connected');
    
    if (savedUser && stayConnectedFlag === 'true') {
      try {
        return JSON.parse(savedUser);
      } catch (error) {
        console.error('Error loading user data:', error);
        localStorage.removeItem('nyra_user');
        localStorage.removeItem('nyra_stay_connected');
        return null;
      }
    } else if (savedUser && stayConnectedFlag !== 'true') {
      // User exists but didn't select "Resta collegato", clear session
      localStorage.removeItem('nyra_user');
    }
    return null;
  });
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('nyra_theme');
    const themePreference = (savedTheme as 'light' | 'dark' | 'system') || 'system';
    
    if (themePreference === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return themePreference === 'dark';
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [showTaskMemory, setShowTaskMemory] = useState(false);
  const [showActionHistory, setShowActionHistory] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Stato per il clock dell'app
  const [appClock, setAppClock] = useState<{now: string, tz: string} | null>(null);
  
  // Stati per il saluto dinamico
  const [parteDelGiorno, setParteDelGiorno] = useState('giornata');
  const [dataFormattata, setDataFormattata] = useState('oggi');
  const [oraFormattata, setOraFormattata] = useState('ora');
  
  // Toast system
  const { toasts, showSuccess, showError, showInfo, removeToast } = useToast();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  // File upload states
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true);
  // TODO: Reactivate if needed to track the first message logic
  // const [isFirstMessage, setIsFirstMessage] = useState(true);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isRecognitionSupported, setIsRecognitionSupported] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const [actions, setActions] = useState<Action[]>([]);

  // Stati per Deepgram voice input
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  // Stati per Email Preview
  const [emailPreviewData, setEmailPreviewData] = useState<any>(null);
  const [isProcessingEmails, setIsProcessingEmails] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  // Stati per Excel Analysis Component
  // Variabili Excel Analysis rimosse - ora usiamo messaggi dentro la chat






  // Initialize empty conversations with proper initialization
  const [chats, setChats] = useState<Chat[]>([]);
  const [conversationMessages, setConversationMessages] = useState<{[key: string]: Message[]}>({});
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversationCounter, setConversationCounter] = useState(1);

  
  // Chat initialization tracking
  const [isChatInitialized, setIsChatInitialized] = useState(false);
  const chatInitRef = useRef(false);

  const excelService = new ExcelService();

  // Static taskMemory array
  const taskMemory: Task[] = [
    {
      id: 1,
      action: "Aperto file documento.txt",
              timestamp: new Date(),
      status: 'completed'
    },
    {
      id: 2,
      action: "Inviato email a cliente@example.com",
              timestamp: new Date(),
      status: 'completed'
    },
    {
      id: 3,
      action: "Programmato meeting per domani",
              timestamp: new Date(),
      status: 'pending'
    }
  ];

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const renderCountRef = useRef(0); // Monitora numero di re-render
  const lastRenderTimeRef = useRef(Date.now()); // Monitora frequenza re-render
  const initialLoadRef = useRef(false); // Traccia se il caricamento iniziale è già stato fatto
  const stateUpdateRef = useRef<Record<string, unknown>>({}); // Traccia aggiornamenti di stato per evitare loop
  const localStorageRef = useRef<{[key: string]: string}>({}); // Cache localStorage per confronti rapidi
  const chatCreationInProgress = useRef(false); // Preveni doppia creazione chat

  // Utility functions
  // FUNZIONE PER CONTROLLI DIFENSIVI ROBUSTI
  const shouldUpdateState = (key: string, newValue: unknown, oldValue?: unknown): boolean => {
    try {
      // Se non c'è un valore precedente, aggiorna
      if (oldValue === undefined) {
        stateUpdateRef.current[key] = newValue;
        return true;
      }
      
      // Confronta i valori
      const oldValueString = JSON.stringify(oldValue);
      const newValueString = JSON.stringify(newValue);
      
      if (oldValueString !== newValueString) {
        stateUpdateRef.current[key] = newValue;
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('⚠️ Errore nel controllo aggiornamento stato:', error);
      return true; // In caso di errore, aggiorna per sicurezza
    }
  };

  // FUNZIONE PER CONTROLLI LOCALSTORAGE ROBUSTI
  const shouldUpdateLocalStorage = (key: string, newValue: unknown): boolean => {
    try {
      const currentStored = localStorageRef.current[key];
      const newValueString = JSON.stringify(newValue);
      
      if (currentStored !== newValueString) {
        localStorageRef.current[key] = newValueString;
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('⚠️ Errore nel controllo localStorage:', error);
      return true; // In caso di errore, aggiorna per sicurezza
    }
  };

  const formatTime = (date: Date | string): string => {
    // GUARD CLAUSE: Controlla se la data è valida
    if (!date) {
      console.warn('⚠️ formatTime: Data null/undefined ricevuta');
      return '--:--';
    }
    
    let dateObj: Date;
    
    // Se è una stringa, prova a convertirla in Date
    if (typeof date === 'string') {
      try {
        dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
          console.warn('⚠️ formatTime: Stringa data invalida:', date);
          return '--:--';
        }
      } catch {
        console.warn('⚠️ formatTime: Errore conversione stringa in Date:', date);
        return '--:--';
      }
    } else if (date instanceof Date) {
      dateObj = date;
      if (isNaN(dateObj.getTime())) {
        console.warn('⚠️ formatTime: Date invalida ricevuta:', date);
        return '--:--';
      }
    } else {
      console.warn('⚠️ formatTime: Tipo data non supportato:', typeof date);
      return '--:--';
    }
    
    try {
      return new Intl.DateTimeFormat('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(dateObj);
    } catch (error) {
      console.error('❌ formatTime: Errore nella formattazione della data:', error);
      return '--:--';
    }
  };

  const formatDate = (date: Date | string): string => {
    // GUARD CLAUSE: Controlla se la data è valida
    if (!date) {
      console.warn('⚠️ formatDate: Data null/undefined ricevuta');
      return '--/--/----';
    }
    
    let dateObj: Date;
    
    // Se è una stringa, prova a convertirla in Date
    if (typeof date === 'string') {
      try {
        dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
          console.warn('⚠️ formatDate: Stringa data invalida:', date);
          return '--/--/----';
        }
      } catch {
        console.warn('⚠️ formatDate: Errore conversione stringa in Date:', date);
        return '--/--/----';
      }
    } else if (date instanceof Date) {
      dateObj = date;
      if (isNaN(dateObj.getTime())) {
        console.warn('⚠️ formatDate: Date invalida ricevuta:', date);
        return '--/--/----';
      }
    } else {
      console.warn('⚠️ formatDate: Tipo data non supportato:', typeof date);
      return '--/--/----';
    }
    
    try {
      return new Intl.DateTimeFormat('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(dateObj);
    } catch (error) {
      console.error('❌ formatDate: Errore nella formattazione della data:', error);
      return '--/--/----';
    }
  };

  // ThinkingDots component moved outside App to prevent re-renders

  // Message component moved outside App to prevent re-renders



  // REGISTRAZIONE UTENTE CON SALVATAGGIO NOME - PREVIENI DUPLICAZIONE
      const handleRegistrationSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // // console.log('Registration form submitted');
    
    // CONTROLLO: Verifica se esiste già un utente registrato
    const existingUser = localStorage.getItem('nyra_user');
          if (existingUser) {
        // // console.log('⚠️ Utente già registrato, aggiorno i dati');
    }
    
    // Per il login, usa l'email come username se non è fornito
    const username = isLogin ? registrationData.email.split('@')[0] : (registrationData.username || '');
    
    // Salva i dati utente in localStorage
    const userData: UserData = {
      email: registrationData.email || '',
      username: username,
      password: registrationData.password || '',
      name: username || 'Utente',
      language: registrationData.language || 'Italiano',
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('nyra_user', JSON.stringify(userData));
    localStorage.setItem('userData', JSON.stringify(userData)); // Per compatibilità con contextBuilder
            localStorage.setItem('username', userData.username); // Per compatibilità diretta
    
    // Imposta l'utente corrente
    setCurrentUser({
      username: userData.username,
      email: userData.email,
      password: userData.password,
      name: userData.name,
      language: userData.language,
      timestamp: userData.timestamp
    });
    
            // // console.log('✅ Utente registrato:', userData.username);
    
    // IMPORTANTE: NON creare conversazioni automatiche
    // Le conversazioni verranno create solo al primo messaggio dell'utente
    setShowWelcomeScreen(false);
  };

  const handleRegistrationInputChange = (field: string, value: string) => {
      setRegistrationData(prev => ({
        ...prev,
        [field]: value
      }));
      
      // Update language when changed
      if (field === 'language') {
        setLanguage(value);
      }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    };

    // File upload handlers
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      
      const files = Array.from(e.dataTransfer.files);
      const excelFiles = files.filter(file => 
        file.name.toLowerCase().endsWith('.xlsx') || 
        file.name.toLowerCase().endsWith('.xls') ||
        file.name.toLowerCase().endsWith('.csv')
      );
      
      if (excelFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...excelFiles]);
        
        // File caricato, aspetta che l'utente prema invio
        if (excelFiles.length > 0) {
          console.log("File Excel caricato, in attesa di istruzioni");
        }
        
        // File aggiunto a uploadedFiles, verrà mostrato sopra la textarea
        
        // showSuccess(`${excelFiles.length} file Excel caricati!`); // Notifica rimossa
      } else {
        showError('Solo file Excel (.xlsx, .xls, .csv) sono supportati');
      }
    };

    const removeFile = (index: number) => {
      setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };



    const handleActionClick = (actionText: string) => {
      setInputMessage(actionText);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    };

    const handleLogout = () => {
      // Clear user data from localStorage
      localStorage.removeItem('nyra_user');
      localStorage.removeItem('userData');
      localStorage.removeItem('username');
      localStorage.removeItem('nyra_stay_connected');
      localStorage.removeItem('nyra_conversations');
      localStorage.removeItem('nyra_conversation_messages');
      localStorage.removeItem('nyra_conversation_counter');
      localStorage.removeItem('nyra_actions');
      
      // Reset all state
      setCurrentUser(null);
      setChats([]);
      setConversationMessages({});
      setActiveConversationId(null);
      setMessages([]);
      setActions([]);
      setConversationCounter(1);
      
      // Show welcome screen
      setShowWelcomeScreen(true);
      setShowWelcomeMessage(true);
      // TODO: Reactivate if needed to track the first message logic
      // setIsFirstMessage(true);
    };

    const togglePasswordVisibility = () => {
      setShowPasswordVisible(!showPassword);
    };

    // Localization object
    const texts = {
      Italiano: {
        // Welcome screen
        welcomeTitle: "Welcome to NYRA",
        welcomeSubtitle: "Your personal AI assistant to write, plan, organize and automate on your computer.",
        welcomeBack: "Welcome back",
        getStarted: "Get started",
        signIn: "Sign In",
        signUp: "Sign up",
        logIn: "Log in",
        startUsingNyra: "Start using NYRA",
        dontHaveAccount: "Don't have an account?",
        alreadyHaveAccount: "Already have an account?",
        selectLanguage: "Select your language",
        stayConnected: "Resta collegato",
        
        // Main interface
        newChat: "Nuova chat",
        recentConversations: "Conversazioni Recenti",
        online: "Online",
        offline: "Offline",
        // DA RIMUOVERE: risposta fissa preimpostata usata per test
        // welcomeMessage: "Ciao {name}, come posso aiutarti oggi?",
        messagePlaceholder: "Invia messaggio a Nyra",
        
        // Quick actions
        writeEmail: "Scrivi una mail",
        setCalendar: "Imposta calendario", 
        openFile: "Apri un file",
        openSafari: "Apri Safari",
        
        // Quick action texts
        emailText: "Ciao Nyra, scrivi una mail a [inserisci destinatario]",
        calendarText: "Ciao Nyra, crea un evento per [inserisci data e ora]",
        fileText: "Ciao Nyra, apri il file [inserisci nome file]",
        safariText: "Ciao Nyra, apri Safari e vai su [inserisci sito web]",
        
        // Settings
        settings: "Impostazioni",
        preferences: "Preferenze",
        aiModel: "Modello AI",
        selectModel: "Seleziona modello",
        account: "Account",
        subscription: "Abbonamento",
        subscriptionManagement: "Gestione abbonamento",
        standardPlan: "Piano Standard",
        
        // Action history
        actionHistory: "Action History",
        noActionsYet: "No actions yet",
        
        // DA RIMUOVERE: risposte fisse preimpostate usate per test
        // AI responses
        // emailResponse: "Perfetto! Posso aiutarti con la gestione delle email. Dimmi cosa devi fare: scrivere, inviare o organizzare la posta?",
        // calendarResponse: "Ottimo! Ti aiuto con il calendario. Vuoi creare un nuovo evento, controllare gli appuntamenti o modificare qualcosa?",
        // fileResponse: "Perfetto! Posso aiutarti con i file. Cosa devi fare: aprire, organizzare o cercare documenti?",
        // safariResponse: "Perfetto! Ti aiuto con la navigazione web. Quale sito vuoi visitare o cosa devi cercare?",
        // greetingResponse: "Ciao! Sono qui per aiutarti. Cosa posso fare per te oggi?",
        // generalResponse: "Ho capito. Come posso aiutarti con questo?",
        
        // Chat titles
        emailManagement: "Gestione Email",
        calendarManagement: "Gestione Calendario", 
        fileManagement: "Gestione File",
        webNavigation: "Navigazione Web",
        generalConversation: "Conversazione Generale",
        generalAssistance: "Assistenza Generale",
        
        // Action descriptions
        emailAssistance: "Assistenza gestione email richiesta",
        calendarAssistance: "Assistenza calendario richiesta",
        fileAssistance: "Assistenza gestione file richiesta",
        webAssistance: "Assistenza navigazione web richiesta",
        generalConversationStarted: "Conversazione generale iniziata",
        generalAssistanceProvided: "Assistenza generale fornita",
        
        // Error messages
        apiTimeoutError: "⚠️ Il server AI non ha risposto (timeout). Riprova tra poco.",
        apiConnectionError: "⚠️ Errore di connessione al server AI. Verifica la connessione internet.",
        apiGenericError: "⚠️ Errore del server AI. Riprova più tardi.",
        noResponseError: "⚠️ Nessuna risposta dal server AI. Riprova.",
        fallbackMessage: "⚠️ Servizio temporaneamente non disponibile. Riprova tra qualche minuto."
      },
      English: {
        // Welcome screen
        welcomeTitle: "Welcome to NYRA",
        welcomeSubtitle: "Your personal AI assistant to write, plan, organize and automate on your computer.",
        welcomeBack: "Welcome back",
        getStarted: "Get started", 
        signIn: "Sign In",
        signUp: "Sign up",
        logIn: "Log in",
        startUsingNyra: "Start using NYRA",
        dontHaveAccount: "Don't have an account?",
        alreadyHaveAccount: "Already have an account?",
        selectLanguage: "Select your language",
        stayConnected: "Stay connected",
        
        // Main interface
        newChat: "New chat",
        recentConversations: "Recent Conversations",
        online: "Online",
        offline: "Offline", 
        // DA RIMUOVERE: risposta fissa preimpostata usata per test
        // welcomeMessage: "Hi {name}, how can I help you today?",
        messagePlaceholder: "Send message to Nyra",
        
        // Quick actions
        writeEmail: "Write an email",
        setCalendar: "Set calendar",
        openFile: "Open a file", 
        openSafari: "Open Safari",
        
        // Quick action texts
        emailText: "Hi Nyra, write an email to [insert recipient]",
        calendarText: "Hi Nyra, create an event for [insert date and time]",
        fileText: "Hi Nyra, open the file [insert file name]",
        safariText: "Hi Nyra, open Safari and go to [insert website]",
        
        // Settings
        settings: "Settings",
        preferences: "Preferences", 
        aiModel: "AI Model",
        selectModel: "Select model",
        account: "Account",
        subscription: "Subscription",
        subscriptionManagement: "Subscription management",
        standardPlan: "Standard Plan",
        
        // Action history
        actionHistory: "Action History",
        noActionsYet: "No actions yet",
        
        // DA RIMUOVERE: risposte fisse preimpostate usate per test
        // AI responses
        // emailResponse: "Perfect! I can help you with email management. Tell me what you need to do: write, send or organize mail?",
        // calendarResponse: "Great! I'll help you with the calendar. Do you want to create a new event, check appointments or modify something?",
        // fileResponse: "Perfect! I can help you with files. What do you need to do: open, organize or search documents?",
        // safariResponse: "Perfect! I'll help you with web navigation. Which site do you want to visit or what do you need to search for?",
        // greetingResponse: "Hi! I'm here to help you. What can I do for you today?",
        // generalResponse: "I understand. How can I help you with this?",
        
        // Chat titles
        emailManagement: "Email Management",
        calendarManagement: "Calendar Management",
        fileManagement: "File Management", 
        webNavigation: "Web Navigation",
        generalConversation: "General Conversation",
        generalAssistance: "General Assistance",
        
        // Action descriptions
        emailAssistance: "Email management assistance requested",
        calendarAssistance: "Calendar assistance requested", 
        fileAssistance: "File management assistance requested",
        webAssistance: "Web navigation assistance requested",
        generalConversationStarted: "General conversation started",
        generalAssistanceProvided: "General assistance provided",
        
        // Error messages
        apiTimeoutError: "⚠️ AI server did not respond (timeout). Try again in a moment.",
        apiConnectionError: "⚠️ Connection error to AI server. Check your internet connection.",
        apiGenericError: "⚠️ AI server error. Try again later.",
        noResponseError: "⚠️ No response from AI server. Try again.",
        fallbackMessage: "⚠️ Service temporarily unavailable. Try again in a few minutes."
      }
    };
    
    // Get current language texts
    const t = texts[language as keyof typeof texts] || texts.Italiano;

    // Handle language change
    const handleLanguageChange = (newLanguage: string) => {
      setLanguage(newLanguage);
    };

    // Handle theme change
    const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
      setTheme(newTheme);
      localStorage.setItem('nyra_theme', newTheme);
      
      let shouldBeDark = false;
      if (newTheme === 'system') {
        shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        shouldBeDark = newTheme === 'dark';
      }
      
      setIsDarkMode(shouldBeDark);
      
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Dark mode toggle (for existing toggle button)
    const toggleDarkMode = () => {
      const newTheme = isDarkMode ? 'light' : 'dark';
      handleThemeChange(newTheme);
    };

    // Initialize dark mode on mount
    useEffect(() => {
      // Apply dark mode class immediately on mount
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      // Listen for system theme changes when theme is set to 'system'
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        if (theme === 'system') {
          // FIX: Evita loop infinito controllando se il valore è già corretto
          if (isDarkMode !== e.matches) {
            setIsDarkMode(e.matches);
            if (e.matches) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
        }
      };
      
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      
      return () => {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      };
    }, [theme]); // FIX: Rimuovo isDarkMode dalle dependencies per evitare loop

    // Update theme when theme state changes
    useEffect(() => {
      let shouldBeDark = false;
      if (theme === 'system') {
        shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        shouldBeDark = theme === 'dark';
      }
      
      setIsDarkMode(shouldBeDark);
      
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }, [theme]);

    // Initialize speech recognition
    useEffect(() => {
      // Close user menu when clicking outside
      const handleClickOutside = (event: MouseEvent) => {
        if (showUserMenu) {
          const target = event.target as Element;
          if (!target.closest('.user-profile')) {
            setShowUserMenu(false);
          }
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showUserMenu]);

    // Helper function to map language to BCP 47 language tags
    const getLanguageCode = (lang: string): string => {
      switch (lang) {
        case 'English':
          return 'en-US';
        case 'Italiano':
        default:
          return 'it-IT';
      }
    };

    // Initialize speech recognition with dynamic language
    useEffect(() => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = getLanguageCode(language);
        
        recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setInputMessage(transcript);
        };
        
        recognitionInstance.onend = () => {
          setIsListening(false);
        };
        
        recognitionInstance.onerror = (event: Event) => {
          console.error('Speech recognition error:', event);
          setIsListening(false);
        };
        
        setRecognition(recognitionInstance);
        setIsRecognitionSupported(true);
      } else {
        setIsRecognitionSupported(false);
      }
    }, [language]); // Solo language nelle dipendenze

    // Cleanup effect separato per evitare cicli infiniti
    useEffect(() => {
      return () => {
        if (recognition) {
          recognition.stop();
        }
      };
    }, []); // Array vuoto - eseguito solo al mount/unmount

         // Test IPC connection quando app si carica
     useEffect(() => {
       const testIPC = async () => {
         if (electronBridge.isElectron()) {
           // console.log('🔗 Testing IPC connection...');
           
           const connected = await electronBridge.testConnection();
           if (connected) {
             // console.log('✅ IPC connection successful');
             
                         // App info check removed - not used
             
             // Setup automation status listener
             electronBridge.onStatusUpdate((status) => {
               // console.log('Automation status update:', status);
               
               // Mostra status updates nella chat se c'è un'automazione in corso
               if (status.type === 'action' || status.type === 'success') {
                 // Potresti aggiungere un banner temporaneo con lo status
                 // console.log(`NYRA: ${status.message}`);
               }
             });
             
             await electronBridge.logToMain('NYRA renderer loaded successfully');
             
             // Test visual automation - removed for now
             // console.log('Visual automation test skipped');
           }
         }
       };
       
       testIPC();
     }, []);







    // Scroll intelligente che rispetta la posizione dell'utente
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      }
    };

    // Controlla se l'utente è vicino al fondo della chat
    const isUserNearBottom = () => {
      const chatContainer = document.querySelector('.messages') as HTMLElement;
      if (!chatContainer) return true;
      
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      const threshold = 100; // 100px di tolleranza
      
      return scrollHeight - scrollTop - clientHeight < threshold;
    };

    // Auto-scroll intelligente: SOLO quando vengono aggiunti NUOVI messaggi (non durante la digitazione)
    useEffect(() => {
      // ✅ Scroll SOLO quando:
      // 1. Ci sono messaggi
      // 2. L'utente è vicino al fondo  
      // 3. NON è durante la digitazione (controllo prevMessages.length)
      if (messages.length > 0 && isUserNearBottom()) {
        // Controlla se è un messaggio nuovo (non digitazione)
        const prevMessagesLength = messages.length;
        if (prevMessagesLength > 0) {
          scrollToBottom();
        }
      }
    }, [messages]);

    // Initialize chat system on app startup
    useEffect(() => {
      // console.log('🚀 Inizializzazione sistema chat...');
      
      // CONTROLLO: Verifica se l'inizializzazione è già stata fatta
      if (chatInitRef.current) {
        // console.log('⚠️ Inizializzazione chat già completata, salto');
        return;
      }
      
      // CONTROLLO: Verifica se l'app è pronta prima di inizializzare
      if (!isAppReady) {
        // console.log('⚠️ App non ancora pronta, salto l\'inizializzazione');
        return;
      }
      
      // GARANTISCI SEMPRE UNA CHAT ATTIVA ALL'AVVIO
      const activeChatId = ensureActiveChat();
      
      if (activeChatId) {
        // console.log('✅ Chat attiva garantita all\'avvio:', activeChatId);
        setIsChatInitialized(true);
        chatInitRef.current = true;
      } else {
        console.error('❌ Errore: Impossibile garantire una chat attiva all\'avvio');
      }
    }, [isAppReady]); // Dipendenza solo da isAppReady per evitare loop

    // Backup initialization check - se dopo 2 secondi non è ancora inizializzato
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        if (!isChatInitialized && isAppReady) {
          console.warn('⚠️ Timeout inizializzazione chat, forzo la creazione...');
          const activeChatId = ensureActiveChat();
          if (activeChatId) {
            setIsChatInitialized(true);
            chatInitRef.current = true;
            // console.log('✅ Chat attiva creata dopo timeout:', activeChatId);
          }
        }
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }, [isChatInitialized, isAppReady]);



    // Load conversations and actions from localStorage on mount - PREVIENI DUPLICAZIONE E RE-RENDER INFINITI
    useEffect(() => {
      // console.log('🔄 Caricamento conversazioni da localStorage...');
      
      // CONTROLLO: Verifica se il caricamento iniziale è già stato fatto
      if (initialLoadRef.current) {
        // console.log('⚠️ Caricamento iniziale già completato, salto');
        return;
      }
      
      // CONTROLLO: Verifica se ci sono già conversazioni caricate
      if (chats.length > 0) {
        // console.log('⚠️ Conversazioni già caricate, salto il caricamento');
        return;
      }
      
      // CONTROLLO: Verifica se l'app è pronta prima di caricare
      if (!isAppReady) {
        // console.log('⚠️ App non ancora pronta, salto il caricamento');
        return;
      }
      
      const savedChats = localStorage.getItem('nyra_conversations');
      const savedActions = localStorage.getItem('nyra_actions');
      const savedMessages = localStorage.getItem('nyra_conversation_messages');
      const savedCounter = localStorage.getItem('nyra_conversation_counter');
      
      if (savedChats) {
        try {
          const parsedChats = JSON.parse(savedChats).map((chat: Chat) => ({
            ...chat,
            timestamp: new Date(chat.timestamp)
          }));
          
          // CONTROLLO: Verifica duplicati prima di impostare
          const uniqueChats = parsedChats.filter((chat: Chat, index: number, self: Chat[]) => 
            index === self.findIndex((c: Chat) => c.id === chat.id)
          );
          
          if (uniqueChats.length !== parsedChats.length) {
            console.warn('⚠️ Duplicati rimossi durante il caricamento:', parsedChats.length - uniqueChats.length);
          }
          
          // GARANTISCI ID UNICI PER TUTTE LE CHAT CARICATE
          const chatsWithUniqueIds = uniqueChats.map((chat: Chat) => {
            // Se la chat non ha ID o ha ID duplicato, generane uno nuovo
            if (!chat.id || chat.id.trim() === '' || uniqueChats.filter((c: Chat) => c.id === chat.id).length > 1) {
              const newId = generateGuaranteedUniqueId();
              // console.log('🔄 Aggiornamento ID chat caricata:', chat.id, '→', newId);
              return { ...chat, id: newId };
            }
            return chat;
          });
          
          // Applica ulteriore pulizia per garantire unicità
          const cleanedChats = removeDuplicateChats(chatsWithUniqueIds);
          
          // CONTROLLO: Verifica che il contenuto sia effettivamente cambiato


          
          // CONTROLLO DIFENSIVO: Verifica se lo stato è già consistente
          if (shouldUpdateState('chats', cleanedChats, chats)) {
            // console.log('✅ Conversazioni caricate e pulite con ID unici:', cleanedChats.length);
            setChats(cleanedChats);
          } else {
            // console.log('⚠️ Nessun cambiamento nelle conversazioni, salto l\'aggiornamento');
          }
          
          // Marca il caricamento iniziale come completato
          initialLoadRef.current = true;
          
          // Reset counter se necessario dopo il caricamento
          setTimeout(() => {
            resetCounterIfNeeded();
          }, 100);
        } catch (error) {
          console.error('❌ Errore caricamento conversazioni:', error);
        }
      }
      
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages);
          // CONTROLLO DIFENSIVO: Verifica se lo stato è già consistente
          if (shouldUpdateState('conversationMessages', parsedMessages, conversationMessages)) {
            setConversationMessages(parsedMessages);
          } else {
            // console.log('⚠️ Nessun cambiamento nei messaggi, salto l\'aggiornamento');
          }
        } catch (error) {
          console.error('❌ Errore caricamento messaggi conversazione:', error);
        }
      }
      
      if (savedCounter) {
        const newCounter = parseInt(savedCounter, 10);
        // CONTROLLO DIFENSIVO: Verifica se lo stato è già consistente
        if (shouldUpdateState('conversationCounter', newCounter, conversationCounter)) {
          setConversationCounter(newCounter);
        } else {
          // console.log('⚠️ Nessun cambiamento nel counter, salto l\'aggiornamento');
        }
      }
      
      if (savedActions) {
        try {
          const parsedActions = JSON.parse(savedActions).map((action: Action) => ({
            ...action,
            timestamp: new Date(action.timestamp)
          }));
          
          // CONTROLLO DIFENSIVO: Verifica se lo stato è già consistente
          if (shouldUpdateState('actions', parsedActions, actions)) {
            setActions(parsedActions);
          } else {
            // console.log('⚠️ Nessun cambiamento nelle azioni, salto l\'aggiornamento');
          }
        } catch (error) {
          console.error('❌ Errore caricamento azioni:', error);
        }
      }
      
      // Marca il caricamento iniziale come completato (anche se non ci sono dati)
      initialLoadRef.current = true;
      // console.log('✅ Caricamento iniziale completato');
      
      // Dopo il caricamento, garantisci che ci sia una chat attiva
      if (chats.length > 0 && !activeConversationId) {
        // console.log('🔄 Dopo il caricamento, garantisco una chat attiva...');
        const activeChatId = ensureActiveChat();
        if (activeChatId) {
          // console.log('✅ Chat attiva garantita dopo il caricamento:', activeChatId);
        }
      }
    }, []); // Rimuovo chats.length dalla dipendenza per evitare re-render infiniti

    // Pulizia automatica chat duplicate quando chats cambia - PREVIENI RE-RENDER INFINITI
    useEffect(() => {
      if (chats.length > 0) {
        // CONTROLLO DIFENSIVO: Verifica se ci sono effettivamente duplicati prima di pulire
        const uniqueChats = removeDuplicateChats(chats);
        if (uniqueChats.length !== chats.length) {
          // console.log('🧹 Pulizia chat duplicate necessaria:', chats.length, '→', uniqueChats.length);
          // FIX: Usa setTimeout per evitare loop infinito
          setTimeout(() => {
            cleanDuplicateChats();
          }, 0);
        } else {
          // console.log('⚠️ Nessuna pulizia necessaria, salto l\'operazione');
        }
      }
    }, [chats.length]);

    // CONTROLLO DIFENSIVO: Preveni re-render infiniti per useEffect con chats
    useEffect(() => {
      // Verifica che chats non sia cambiato inutilmente
      const chatsString = JSON.stringify(chats);
      const lastChatsString = stateUpdateRef.current['lastChatsString'];
      
      if (lastChatsString === chatsString) {
        // console.log('⚠️ Chats non cambiati, salto operazioni correlate');
        return;
      }
      
      stateUpdateRef.current['lastChatsString'] = chatsString;
    }, [chats]);

    // Assegna titoli unici quando le chat cambiano - PREVIENI RE-RENDER INFINITI
    useEffect(() => {
      if (chats.length > 0) {
        // CONTROLLO: Verifica se ci sono titoli duplicati prima di assegnare
        const titleCounts = new Map<string, number>();
        chats.forEach(chat => {
          const count = titleCounts.get(chat.name) || 0;
          titleCounts.set(chat.name, count + 1);
        });
        
        const hasDuplicates = Array.from(titleCounts.values()).some(count => count > 1);
        
        if (hasDuplicates) {
          // FIX: Usa requestAnimationFrame per evitare loop infinito
          requestAnimationFrame(() => {
            assignUniqueTitles();
          });
        }
      }
    }, [chats.length]);

    // Verifica e correggi titoli duplicati al caricamento
    useEffect(() => {
      if (chats.length > 0) {
        fixDuplicateTitles();
      }
    }, []);

    // Garantisci ID unici al caricamento
    useEffect(() => {
      if (chats.length > 0) {
        ensureUniqueChatIds();
      }
    }, []);

    // Verifica chiavi duplicate nel rendering - OTTIMIZZATO
    useEffect(() => {
      if (chats.length > 0) {
        // CONTROLLO: Verifica se ci sono effettivamente problemi prima di eseguire controlli
        const renderKeys = ensureUniqueRenderKeys();
        const uniqueKeysSet = new Set(renderKeys);
        const hasKeyDuplicates = renderKeys.length !== uniqueKeysSet.size;
        
        const chatIds = chats.map(chat => chat.id).filter(id => id && id.trim() !== '');
        const uniqueChatIds = new Set(chatIds);
        const hasIdDuplicates = chatIds.length !== uniqueChatIds.size;
        
        if (hasKeyDuplicates || hasIdDuplicates) {
          // Esegui correzione in modo asincrono per evitare loop
          requestAnimationFrame(() => {
            if (hasKeyDuplicates) {
              fixDuplicateKeys();
            }
            if (hasIdDuplicates) {
              ensureUniqueChatIds();
            }
          });
        }
      }
    }, [chats.length]);

    // Save conversations to localStorage whenever chats change - PREVIENI RE-RENDER INFINITI
    useEffect(() => {
      // CONTROLLO DIFENSIVO: Usa la funzione di utilità per controlli robusti
      if (shouldUpdateLocalStorage('nyra_conversations', chats)) {
        localStorage.setItem('nyra_conversations', JSON.stringify(chats));
      }
    }, [chats]);

    // Save conversation messages to localStorage - PREVIENI RE-RENDER INFINITI
    useEffect(() => {
      // CONTROLLO DIFENSIVO: Usa la funzione di utilità per controlli robusti
      if (shouldUpdateLocalStorage('nyra_conversation_messages', conversationMessages)) {
        localStorage.setItem('nyra_conversation_messages', JSON.stringify(conversationMessages));
      }
    }, [conversationMessages]);

    // Save conversation counter to localStorage - PREVIENI RE-RENDER INFINITI
    useEffect(() => {
      // console.log('🔄 setState: Saving conversationCounter to localStorage', conversationCounter);
      
      // CONTROLLO DIFENSIVO: Usa la funzione di utilità per controlli robusti
      if (shouldUpdateLocalStorage('nyra_conversation_counter', conversationCounter)) {
        localStorage.setItem('nyra_conversation_counter', conversationCounter.toString());
        // console.log('✅ Conversation counter salvato in localStorage');
      } else {
        // console.log('⚠️ Conversation counter non cambiato, salto il salvataggio');
      }
    }, [conversationCounter]);

    // Save actions to localStorage whenever actions change - PREVIENI RE-RENDER INFINITI
    useEffect(() => {
      // console.log('🔄 setState: Saving actions to localStorage', actions.length);
      
      // CONTROLLO DIFENSIVO: Usa la funzione di utilità per controlli robusti
      if (shouldUpdateLocalStorage('nyra_actions', actions)) {
        localStorage.setItem('nyra_actions', JSON.stringify(actions));
        // console.log('✅ Actions salvate in localStorage');
      } else {
        // console.log('⚠️ Actions non cambiate, salto il salvataggio');
      }
    }, [actions]);

    // Save language to localStorage whenever it changes - PREVIENI RE-RENDER INFINITI
    useEffect(() => {
      // console.log('🔄 setState: Saving language to localStorage', language);
      
      // CONTROLLO DIFENSIVO: Usa la funzione di utilità per controlli robusti
      if (shouldUpdateLocalStorage('nyra_language', language)) {
        localStorage.setItem('nyra_language', language);
        // console.log('✅ Language salvato in localStorage');
      } else {
        // console.log('⚠️ Language non cambiato, salto il salvataggio');
      }
    }, [language]);

    // Check if app is ready (all initial data loaded) - PREVIENI RE-RENDER INFINITI
    useEffect(() => {
      // App is ready when:
      // 1. Welcome screen is not shown (user is logged in)
      // 2. Or welcome screen is shown but user has interacted
      const isReady = !shouldShowWelcome || (shouldShowWelcome && currentUser !== null);
      
      // CONTROLLO DIFENSIVO: Usa la funzione di utilità per controlli robusti
      if (shouldUpdateState('isAppReady', isReady, isAppReady)) {
        // console.log('🔄 Aggiornamento stato app ready:', isAppReady, '→', isReady);
        setIsAppReady(isReady);
      } else {
        // console.log('⚠️ Stato app ready non cambiato, salto l\'aggiornamento');
      }
    }, [shouldShowWelcome, currentUser]); // RIMOSSO isAppReady dalla dipendenza per evitare loop

    // Monitoraggio re-render per prevenire loop infiniti
    useEffect(() => {
      renderCountRef.current += 1;
      const now = Date.now();
      const timeSinceLastRender = now - lastRenderTimeRef.current;
      lastRenderTimeRef.current = now;
      
      // Log solo se ci sono troppi re-render rapidi
      if (timeSinceLastRender < 100) { // Meno di 100ms tra re-render
        // Se ci sono troppi re-render rapidi, logga un warning
        if (renderCountRef.current > 10 && timeSinceLastRender < 50) {
          console.error('❌ POSSIBILE LOOP INFINITO RILEVATO! Troppi re-render rapidi');
        }
      }
    }, []); // FIX: Aggiungo dependency array vuoto per eseguire solo al mount

    // Monitoraggio aggiornamenti di stato per prevenire loop infiniti
    useEffect(() => {
      // Logga solo se ci sono troppi aggiornamenti di stato
      const stateUpdates = Object.keys(stateUpdateRef.current).length;
      if (stateUpdates > 5) {
        console.warn(`⚠️ Troppi aggiornamenti di stato rilevati: ${stateUpdates}`);
        console.warn('Stati aggiornati:', Object.keys(stateUpdateRef.current));
      }
    });

    // Inizializzazione cache localStorage - PREVIENI RE-RENDER INFINITI
    useEffect(() => {
      try {
        // Inizializza la cache localStorage per controlli rapidi
        const keys = ['nyra_conversations', 'nyra_conversation_messages', 'nyra_conversation_counter', 'nyra_actions', 'nyra_language'];
        keys.forEach(key => {
          const value = localStorage.getItem(key);
          if (value) {
            localStorageRef.current[key] = value;
          }
        });
        // console.log('✅ Cache localStorage inizializzata');
      } catch (error) {
        console.warn('⚠️ Errore nell\'inizializzazione cache localStorage:', error);
      }
    }, []);

    // Inizializzazione conversazione - EVITA DUPLICAZIONE
    useEffect(() => {
      const counter = localStorage.getItem('nyra_conversation_counter');
      if (!counter || Number(counter) === 0) {
        // console.log('🔄 Primo avvio: inizializzazione conversazione');
        // Non creare automaticamente una conversazione
        // Aspetta il primo messaggio dell'utente
      } else {
        // Se ci sono già conversazioni, resetta il flag per permettere creazioni future
        // console.log('✅ Chat esistenti trovate, flag reset per creazioni future');
      }
    }, []);

    // ATTIVA AUTOMATICAMENTE LA PRIMA CHAT ALL'AVVIO
    useEffect(() => {
      if (isAppReady && chats.length > 0 && !activeConversationId) {
        // console.log('🔄 App pronta, attivo automaticamente la prima chat');
        const activeChatId = ensureActiveChat();
        if (activeChatId) {
          // console.log('✅ Prima chat attivata automaticamente:', activeChatId);
        }
      }
    }, [isAppReady, chats.length, activeConversationId]);

    // CARICA UTENTE ALL'AVVIO - NOME DINAMICO - PREVIENI RE-RENDER INFINITI
    useEffect(() => {
      try {
        const savedUser = localStorage.getItem('nyra_user');
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          if (userData.username) {
            // CONTROLLO: Verifica che l'utente sia effettivamente cambiato
            const newUser: UserData = {
              username: userData.username,
              email: userData.email || '',
              password: userData.password || '',
              name: userData.name,
              language: userData.language,
              timestamp: userData.timestamp
            };
            
            // CONTROLLO DIFENSIVO: Usa la funzione di utilità per controlli robusti
            if (shouldUpdateState('currentUser', newUser, currentUser)) {
              // console.log('✅ Utente caricato all\'avvio:', userData.username);
              setCurrentUser(newUser);
            } else {
              // console.log('⚠️ Utente non cambiato, salto l\'aggiornamento');
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Errore nel caricamento utente all\'avvio:', error);
      }
    }, []); // Esegui solo al mount, non dipendere da currentUser

    // AGGIORNA NOME UTENTE QUANDO CAMBIA - PREVIENI RE-RENDER INFINITI
    useEffect(() => {
      if (currentUser?.username) {
        // console.log('🔄 Nome utente aggiornato:', currentUser.username);
        // Forza re-render del componente che mostra il nome
        // Non aggiornare lo stato qui per evitare loop infiniti
      }
    }, [currentUser?.username]);

    // useEffect per aggiungere messaggio iniziale di Nyra al primo avvio
    useEffect(() => {
      // RIMOSSO: Non aggiungiamo più messaggi iniziali per evitare doppio saluto
      // Il saluto dinamico viene già mostrato nel render
    }, [currentUser, messages.length, activeConversationId, isChatInitialized]);

    // RIMOSSO: Salvataggio ridondante in nyra_chats per evitare duplicazione
    // I chat vengono già salvati in 'nyra_conversations' nel useEffect precedente



    const quickActions = [
      { icon: Mail, label: t.writeEmail, action: 'email', text: t.emailText },
      { icon: Calendar, label: t.setCalendar, action: 'calendar', text: t.calendarText },
      { icon: FolderOpen, label: t.openFile, action: 'file', text: t.fileText },
      { icon: Globe, label: t.openSafari, action: 'safari', text: t.safariText },
    ];

    const handleNewChat = () => {
      // Reset flag per permettere creazione manuale
      chatCreationInProgress.current = false;
      
      // console.log('🆕 Creazione nuova chat tramite handleNewChat');
      
      // Genera nome unico per la chat
      const uniqueChatName = generateUniqueChatName();
      
      // Create new conversation with guaranteed unique ID
      const newChat: Chat = {
        id: generateGuaranteedUniqueId(),
        name: uniqueChatName,
        lastMessage: '',
        timestamp: new Date(),
        isActive: true
      };

      // Deactivate all existing chats first
      setChats(prevChats => 
        prevChats.map(chat => ({
          ...chat,
          isActive: false
        }))
      );

      // Update chat list: add new one at top
      addChatSafely(newChat);

      // Set as active conversation
      setActiveConversationId(newChat.id);
      setConversationCounter(prev => prev + 1);
      
      // Reset conversation state
      setMessages([]);
      setInputMessage('');
      setShowWelcomeScreen(false);
      // TODO: Reactivate if needed to track the first message logic
      // setIsFirstMessage(true);
      setShowWelcomeMessage(true);
      
      // Reset counter se necessario
      setTimeout(() => {
        resetCounterIfNeeded();
      }, 100);
      
      // Focus input e scroll dopo la creazione
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
      
      // Log analytics per nuova chat creata
      console.log('📊 [ANALYTICS] new_chat_created', {
        timestamp: new Date().toISOString(),
        conversationId: newChat.id,
        chatName: newChat.name
      });
      
      // console.log('✅ Nuova chat creata:', newChat.name);
    };

    const toggleSpeechRecognition = () => {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    };

    const handleConversationClick = (conversationId: string) => {
      // Set as active conversation
      setChats(prevChats => 
        prevChats.map(chat => ({
          ...chat,
          isActive: chat.id === conversationId
        }))
      );
      
      setActiveConversationId(conversationId);
      
      // Load conversation messages
      const conversationMsgs = conversationMessages[conversationId] || [];
      setMessages(conversationMsgs);
      
      // Hide welcome message if there are messages
      setShowWelcomeMessage(conversationMsgs.length === 0);
      // TODO: Reactivate if needed to track the first message logic
      // setIsFirstMessage(conversationMsgs.length === 0);
    };

    // N8N System - hasExistingConversation function removed

    // hasActiveChat function removed (unused)

    // FUNZIONE PER GARANTIRE SEMPRE UNA CHAT ATTIVA
    const ensureActiveChat = (): string | null => {
      try {
        // 1. Controlla se c'è già una chat attiva nello stato
        const existingActiveChat = chats.find(chat => chat.isActive);
        if (existingActiveChat) {
          // console.log('✅ Chat attiva trovata, uso quella esistente:', existingActiveChat.id);
          setActiveConversationId(existingActiveChat.id);
          return existingActiveChat.id;
        }
        
        // 2. Se ci sono chat ma nessuna attiva, attiva la prima
        if (chats.length > 0) {
          // console.log('🔄 Chat esistenti ma inattive, attivo la prima');
          const firstChat = chats[0];
          
          // Attiva la prima chat
          setChats(prevChats => 
            prevChats.map(chat => ({
              ...chat,
              isActive: chat.id === firstChat.id
            }))
          );
          
          setActiveConversationId(firstChat.id);
          // console.log('✅ Prima chat attivata:', firstChat.id);
          return firstChat.id;
        }
        
        // 3. Controlla localStorage per chat esistenti
        const savedChats = localStorage.getItem('nyra_conversations');
        if (savedChats) {
          try {
            const parsedChats = JSON.parse(savedChats).map((chat: any) => ({
              ...chat,
              timestamp: new Date(chat.timestamp)
            }));
            
            if (parsedChats.length > 0) {
              // console.log('🔄 Chat trovate in localStorage, le carico e attivo la prima');
              
              // Rimuovi duplicati
              const uniqueChats = parsedChats.filter((chat: any, index: number, self: any[]) => 
                index === self.findIndex((c: any) => c.id === chat.id)
              );
              
              setChats(uniqueChats);
              
              // Attiva la prima chat
              const firstChat = uniqueChats[0];
              setChats(prevChats => 
                prevChats.map(chat => ({
                  ...chat,
                  isActive: chat.id === firstChat.id
                }))
              );
              
              setActiveConversationId(firstChat.id);
              // console.log('✅ Chat da localStorage attivata:', firstChat.id);
              return firstChat.id;
            }
          } catch (error) {
            console.error('❌ Errore nel caricamento chat da localStorage:', error);
          }
        }
        
        // 4. Nessuna chat trovata - crea una nuova chat di default
        // console.log('🆕 Nessuna chat trovata, creo una nuova chat di default');
        const defaultChatId = generateGuaranteedUniqueId();
        const defaultChat: Chat = {
          id: defaultChatId,
          name: 'Nuova conversazione',
          lastMessage: 'Benvenuto in NYRA!',
          timestamp: new Date(),
          isActive: true
        };
        
        // Aggiungi la chat di default
        setChats([defaultChat]);
        setActiveConversationId(defaultChatId);
        setIsChatInitialized(true);
        chatInitRef.current = true;
        
        // console.log('✅ Chat di default creata e attivata:', defaultChatId);
        return defaultChatId;
      } catch (error) {
        console.error('❌ Errore in ensureActiveChat:', error);
        return null;
      }
    };

    // FUNZIONE PER GENERARE NOME CHAT UNICO
    const generateUniqueChatName = (baseName: string = 'Chat'): string => {
      try {
        // Trova tutti i nomi di chat esistenti
        const existingNames = chats.map(chat => chat.name);
        
        // Se il nome base non esiste, usalo
        if (!existingNames.includes(baseName)) {
          return baseName;
        }
        
        // Altrimenti, trova il prossimo numero disponibile
        let counter = 1;
        let newName = `${baseName} #${counter}`;
        
        while (existingNames.includes(newName)) {
          counter++;
          newName = `${baseName} #${counter}`;
        }
        
        // console.log('✅ Nome chat unico generato:', newName);
        return newName;
      } catch (error) {
        console.warn('❌ Errore nella generazione nome chat:', error);
        return `${baseName} #${Date.now()}`;
      }
    };

    // FUNZIONE PER GENERARE TITOLO UNICO BASATO SU INDICE
    const generateUniqueChatTitle = (chat: Chat, index: number): string => {
      try {
        // Se la chat ha già un nome valido, usalo
        if (chat.name && chat.name.trim() !== '') {
          return chat.name;
        }
        
        // Altrimenti, genera un titolo basato sull'indice
        const baseName = 'Chat';
        let title = `${baseName} #${index + 1}`;
        
        // Verifica che il titolo non sia duplicato
        const existingTitles = chats.map(c => c.name);
        let counter = 1;
        
        while (existingTitles.includes(title)) {
          counter++;
          title = `${baseName} #${index + counter}`;
        }
        
        // console.log('✅ Titolo chat unico generato:', title, 'per indice:', index);
        return title;
      } catch (error) {
        console.warn('❌ Errore nella generazione titolo chat:', error);
        return `Chat #${index + 1}`;
      }
    };

    // FUNZIONE PER ASSEGNARE TITOLI UNICI A TUTTE LE CHAT
    const assignUniqueTitles = (): void => {
      try {
        const updatedChats = chats.map((chat, index) => {
          const uniqueTitle = generateUniqueChatTitle(chat, index);
          if (chat.name !== uniqueTitle) {
            // console.log('🔄 Aggiornamento titolo chat:', chat.name, '→', uniqueTitle);
            return { ...chat, name: uniqueTitle };
          }
          return chat;
        });
        
        if (JSON.stringify(updatedChats) !== JSON.stringify(chats)) {
          // console.log('✅ Titoli unici assegnati a tutte le chat');
          setChats(updatedChats);
        }
      } catch (error) {
        console.warn('❌ Errore nell\'assegnazione titoli unici:', error);
      }
    };

    // FUNZIONE PER VERIFICARE E CORREGGERE TITOLI DUPLICATI
    const fixDuplicateTitles = (): void => {
      try {
        const titleCounts = new Map<string, number>();
        const duplicateTitles: string[] = [];
        
        // Conta occorrenze di ogni titolo
        chats.forEach(chat => {
          const count = titleCounts.get(chat.name) || 0;
          titleCounts.set(chat.name, count + 1);
          if (count > 0) {
            duplicateTitles.push(chat.name);
          }
        });
        
        if (duplicateTitles.length > 0) {
          console.warn('⚠️ Titoli duplicati trovati:', duplicateTitles);
          assignUniqueTitles();
        } else {
          // console.log('✅ Nessun titolo duplicato trovato');
        }
      } catch (error) {
        console.warn('❌ Errore nella verifica titoli duplicati:', error);
      }
    };

    // FUNZIONE PER GARANTIRE ID UNICI E STABILI PER TUTTE LE CHAT
    const ensureUniqueChatIds = (): void => {
      try {
        const updatedChats = chats.map((chat) => {
          // Se la chat non ha un ID o ha un ID duplicato, generane uno nuovo
          if (!chat.id || chats.filter(c => c.id === chat.id).length > 1) {
            const newId = generateGuaranteedUniqueId();
            // console.log('🔄 Aggiornamento ID chat:', chat.id, '→', newId);
            return { ...chat, id: newId };
          }
          return chat;
        });
        
        if (JSON.stringify(updatedChats) !== JSON.stringify(chats)) {
          // console.log('✅ ID unici garantiti per tutte le chat');
          setChats(updatedChats);
        }
      } catch (error) {
        console.warn('❌ Errore nella garanzia ID unici:', error);
      }
    };

    // FUNZIONE PER VERIFICARE E CORREGGERE CHIAVI DUPLICATE NEL RENDERING
    const fixDuplicateKeys = (): void => {
      try {
        const keyCounts = new Map<string, number>();
        const duplicateKeys: string[] = [];
        
        // Conta occorrenze di ogni chiave
        chats.forEach((chat, index) => {
          const key = chat.id && chat.id.trim() !== '' 
            ? chat.id 
            : `chat_${index}_${chat.timestamp?.getTime() || Date.now()}`;
          const count = keyCounts.get(key) || 0;
          keyCounts.set(key, count + 1);
          if (count > 0) {
            duplicateKeys.push(key);
          }
        });
        
        if (duplicateKeys.length > 0) {
          console.warn('⚠️ Chiavi duplicate trovate nel rendering:', duplicateKeys);
          ensureUniqueChatIds();
        } else {
          // console.log('✅ Nessuna chiave duplicata trovata nel rendering');
        }
      } catch (error) {
        console.warn('❌ Errore nella verifica chiavi duplicate:', error);
      }
    };

    // FUNZIONE PER GARANTIRE CHIAVI UNICHE NEL RENDERING CON UUID VERI
    const ensureUniqueRenderKeys = (): string[] => {
      try {
        const usedKeys = new Set<string>();
        const uniqueKeys: string[] = [];
        const keyLog: { [key: string]: string } = {}; // Per logging dettagliato
        
        chats.forEach((chat, index) => {
          // Usa chat.id se esiste e non è vuoto, altrimenti genera UUID
          let key = chat.id && chat.id.trim() !== '' 
            ? chat.id 
            : generateTrueUUID();
          
          // Se la chiave è già stata usata, genera una nuova chiave unica
          if (usedKeys.has(key)) {
            console.warn(`⚠️ Chiave duplicata trovata per chat ${index}:`, key);
            key = generateTrueUUID();
            // console.log(`✅ Nuova chiave generata per chat ${index}:`, key);
          }
          
          usedKeys.add(key);
          uniqueKeys.push(key);
          
          // Log dettagliato per ogni chiave
          keyLog[key] = `Chat #${index + 1} (ID: ${chat.id || 'generato'})`;
        });
        
        // Log dettagliato di tutte le chiavi
        // console.log('🔍 === LOGGING CHIAVI UNICHE ===');
        // console.log('Chiavi totali generate:', uniqueKeys.length);
        // console.log('Chiavi uniche verificate:', usedKeys.size);
        Object.entries(keyLog).forEach(() => {
          // console.log commentato - no variables needed
        });
        // console.log('✅ Chiavi uniche generate per il rendering:', uniqueKeys.length);
        
        return uniqueKeys;
      } catch (error) {
        console.warn('❌ Errore nella generazione chiavi uniche:', error);
        // Fallback: usa UUID per ogni chat
        return chats.map(() => generateTrueUUID());
      }
    };

    // FUNZIONE PER GENERARE UUID VERO E STABILE
    const generateTrueUUID = (): string => {
      try {
        // Genera un UUID v4 vero secondo RFC 4122
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
        
        // console.log('✅ UUID v4 generato:', uuid);
        return uuid;
      } catch (error) {
        console.warn('❌ Errore nella generazione UUID, uso fallback robusto:', error);
        // Fallback con timestamp + random + counter per garantire unicità assoluta
        return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${conversationCounter}`;
      }
    };

    // FUNZIONE PER GENERARE UUID UNICO E STABILE (compatibilità)
    const generateUniqueId = (): string => {
      return generateTrueUUID();
    };

    // FUNZIONE PER VERIFICARE SE ID ESISTE GIÀ
    const isIdUnique = (id: string): boolean => {
      try {
        // Controlla se l'ID esiste già nelle chat
        const existingChat = chats.find(chat => chat.id === id);
        if (existingChat) {
          console.warn('⚠️ ID duplicato trovato:', id);
          return false;
        }
        
        // Controlla anche in localStorage per sicurezza
        const savedChats = localStorage.getItem('nyra_conversations');
        if (savedChats) {
          const parsedChats = JSON.parse(savedChats);
          const existingStoredChat = parsedChats.find((chat: any) => chat.id === id);
          if (existingStoredChat) {
            console.warn('⚠️ ID duplicato trovato in localStorage:', id);
            return false;
          }
        }
        
        // console.log('✅ ID unico verificato:', id);
        return true;
      } catch (error) {
        console.warn('❌ Errore nella verifica ID:', error);
        return false;
      }
    };

    // FUNZIONE PER GENERARE ID UNICO GARANTITO
    const generateGuaranteedUniqueId = (): string => {
      let id = generateUniqueId();
      let attempts = 0;
      const maxAttempts = 10;
      
      while (!isIdUnique(id) && attempts < maxAttempts) {
        // console.log(`🔄 Tentativo ${attempts + 1}: ID duplicato, genero nuovo UUID`);
        id = generateUniqueId();
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        console.error('❌ Impossibile generare ID unico dopo', maxAttempts, 'tentativi');
        // Fallback estremo con timestamp + random + counter
        id = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${conversationCounter}`;
      }
      
      // console.log('✅ ID unico garantito generato:', id);
      return id;
    };

    // FUNZIONE PER RIMUOVERE CHAT DUPLICATE BASATE SU ID
    const removeDuplicateChats = (chatList: Chat[]): Chat[] => {
      try {
        const uniqueChats = chatList.filter((chat, index, self) => {
          // Mantieni solo la prima occorrenza di ogni ID
          const firstIndex = self.findIndex(c => c.id === chat.id);
          return index === firstIndex;
        });
        
        if (uniqueChats.length !== chatList.length) {
          console.warn('⚠️ Chat duplicate rimosse:', chatList.length - uniqueChats.length);
        }
        
        return uniqueChats;
      } catch (error) {
        console.warn('❌ Errore nella rimozione chat duplicate:', error);
        return chatList;
      }
    };

    // FUNZIONE PER VERIFICARE E PULIRE CHAT DUPLICATE
    const cleanDuplicateChats = () => {
      try {
        const cleanedChats = removeDuplicateChats(chats);
        if (cleanedChats.length !== chats.length) {
          // console.log('🧹 Pulizia chat duplicate:', chats.length, '→', cleanedChats.length);
          setChats(cleanedChats);
        }
      } catch (error) {
        console.warn('❌ Errore nella pulizia chat duplicate:', error);
      }
    };

    // FUNZIONE PER VERIFICARE SE CHAT CON STESSO ID ESISTE GIÀ
    const isChatIdExists = (chatId: string): boolean => {
      try {
        // Controlla se l'ID esiste già nelle chat
        const existingChat = chats.find(chat => chat.id === chatId);
        if (existingChat) {
          console.warn('⚠️ Chat con ID già esistente:', chatId);
          return true;
        }
        
        // Controlla anche in localStorage per sicurezza
        const savedChats = localStorage.getItem('nyra_conversations');
        if (savedChats) {
          const parsedChats = JSON.parse(savedChats);
          const existingStoredChat = parsedChats.find((chat: any) => chat.id === chatId);
          if (existingStoredChat) {
            console.warn('⚠️ Chat con ID già esistente in localStorage:', chatId);
            return true;
          }
        }
        
        // console.log('✅ Chat ID unico verificato:', chatId);
        return false;
      } catch (error) {
        console.warn('❌ Errore nella verifica chat ID:', error);
        return false;
      }
    };

    // FUNZIONE PER AGGIUNGERE CHAT SOLO SE ID UNICO
    const addChatSafely = (newChat: Chat): void => {
      try {
        // VERIFICA CHE L'ID SIA UNICO E NON VUOTO
        if (!newChat.id || newChat.id.trim() === '') {
          console.warn('⚠️ Chat senza ID valido, genero nuovo ID');
          newChat.id = generateGuaranteedUniqueId();
        }
        
        if (isChatIdExists(newChat.id)) {
          console.warn('⚠️ Tentativo di aggiungere chat con ID duplicato:', newChat.id);
          // Genera un nuovo ID unico
          newChat.id = generateGuaranteedUniqueId();
          // console.log('✅ Nuovo ID generato:', newChat.id);
        }
        
        // console.log('✅ Aggiunta chat sicura:', newChat.name, 'ID:', newChat.id);
        setChats(prevChats => {
          const updatedChats = [
            newChat,
            ...prevChats
          ];
          
          // Assegna titoli unici dopo l'aggiunta
          setTimeout(() => {
            assignUniqueTitles();
          }, 100);
          
          return updatedChats;
        });
      } catch (error) {
        console.warn('❌ Errore nell\'aggiunta chat sicura:', error);
      }
    };

    // FUNZIONE PER RESETTARE COUNTER SE NECESSARIO
    const resetCounterIfNeeded = () => {
      try {
        // Trova il numero più alto tra i nomi di chat esistenti
        const chatNumbers = chats
          .map(chat => {
            const match = chat.name.match(/#(\d+)$/);
            return match ? parseInt(match[1]) : 0;
          })
          .filter(num => num > 0);
        
        if (chatNumbers.length > 0) {
          const maxNumber = Math.max(...chatNumbers);
          if (maxNumber >= conversationCounter) {
            // console.log('🔄 Reset counter da', conversationCounter, 'a', maxNumber + 1);
            setConversationCounter(maxNumber + 1);
          }
        }
      } catch (error) {
        console.warn('❌ Errore nel reset counter:', error);
      }
    };

    // FUNZIONE PER RECUPERARE NOME UTENTE DINAMICAMENTE
    const getCurrentUserName = (): string => {
      try {
        // Prova prima da currentUser state
        if (currentUser?.username) {
          // console.log('✅ Nome utente da currentUser state:', currentUser.username);
          return currentUser.username;
        }
        
        // Prova da localStorage nyra_user
        const userData = localStorage.getItem('nyra_user');
        if (userData) {
          const parsed = JSON.parse(userData);
          if (parsed.name) {
            // console.log('✅ Nome utente da localStorage nyra_user:', parsed.name);
            return parsed.name;
          }
        }
        
        // Prova da localStorage userData (compatibilità)
        const userDataAlt = localStorage.getItem('userData');
        if (userDataAlt) {
          const parsed = JSON.parse(userDataAlt);
          if (parsed.name) {
            // console.log('✅ Nome utente da localStorage userData:', parsed.name);
            return parsed.name;
          }
        }
        
        // Prova da localStorage username (fallback)
        const username = localStorage.getItem('username');
        if (username) {
          // console.log('✅ Nome utente da localStorage username:', username);
          return username;
        }
        
        // Fallback
        // console.log('⚠️ Nessun nome utente trovato, uso fallback: Utente');
        return 'Utente';
      } catch (error) {
        console.warn('❌ Errore nel recupero nome utente:', error);
        return 'Utente';
      }
    };

    // FUNZIONE PER AGGIUNGERE MESSAGGIO INIZIALE DI NYRA
    const addInitialMessage = () => {
      try {
        // console.log('🎯 Aggiungendo messaggio iniziale di Nyra...');
        
        const initialMessage: Message = {
          id: generateGuaranteedUniqueId(),
          text: getDynamicGreeting(new Date(), getLocalTZ(), currentUser?.name),
          isUser: false,
          timestamp: new Date(),
          type: 'normal'
        };
        
        // console.log('✅ Messaggio iniziale creato:', initialMessage);
        
        // Aggiorna lo stato dei messaggi
        setMessages([initialMessage]);
        
        // Salva in localStorage se c'è una chat attiva
        if (activeConversationId) {
          setConversationMessages(prev => ({
            ...prev,
            [activeConversationId]: [initialMessage]
          }));
          
          // Salva in localStorage
          const savedMessages = localStorage.getItem('nyra_messages');
          const parsedMessages = savedMessages ? JSON.parse(savedMessages) : {};
          parsedMessages[activeConversationId] = [initialMessage];
          localStorage.setItem('nyra_messages', JSON.stringify(parsedMessages));
          
          // console.log('✅ Messaggio iniziale salvato in localStorage per chat:', activeConversationId);
        }
        
        // ✅ Scroll alla fine quando viene aggiunto il messaggio iniziale
        setTimeout(() => {
          scrollToBottom();
        }, 100);
        
        // console.log('✅ Messaggio iniziale aggiunto con successo');
      } catch (error) {
        console.error('❌ Errore nell\'aggiunta del messaggio iniziale:', error);
      }
    };

    // N8N System - Playwright test function removed

    // N8N System - Test functions removed

    const getConversationTitle = (messageContent: string): string => {
      const content = messageContent.toLowerCase();
      if (content.includes('email') || content.includes('mail')) return 'Email Management';
      if (content.includes('calendario') || content.includes('appuntamento')) return 'Calendar Planning';
      if (content.includes('file') || content.includes('documento')) return 'File Management';
      if (content.includes('safari') || content.includes('browser')) return 'Web Navigation';
      return `Chat #${conversationCounter}`;
    };

    // N8N System - Browser request detection removed

    const adjustTextareaHeight = () => {
      // DEBOUNCE: Evita chiamate eccessive
      if (adjustHeightTimeoutRef.current) {
        clearTimeout(adjustHeightTimeoutRef.current);
      }
      
      adjustHeightTimeoutRef.current = setTimeout(() => {
        if (textareaRef.current) {
          const textarea = textareaRef.current;
          textarea.style.height = 'auto';
          const scrollHeight = textarea.scrollHeight;
          
          // Minimo 1 riga (circa 40px), massimo 5 righe (circa 120px)
          const minHeight = 40;
          const maxHeight = 120;
          const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
          
          textarea.style.height = `${newHeight}px`;
          textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
        }
      }, 100); // Debounce di 100ms
    };

    // N8N System - Search request detection removed

    // FUNZIONI PER DEEPGRAM VOICE INPUT
    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        
        recorder.ondataavailable = (e) => chunks.push(e.data);
        
        recorder.onstop = async () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          
          const response = await fetch('https://api.deepgram.com/v1/listen?language=it&model=nova-2', {
            method: 'POST',
            headers: {
              'Authorization': `Token ${import.meta.env.VITE_DEEPGRAM_API_KEY}`,
              'Content-Type': 'audio/webm'
            },
            body: audioBlob
          });
          
          const data = await response.json();
          const transcript = data.results?.channels[0]?.alternatives[0]?.transcript || '';
          
          if (transcript) {
            setInputMessage(prev => prev + transcript + ' ');
          }
          
          stream.getTracks().forEach(track => track.stop());
        };
        
        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      } catch (error) {
        console.error('Errore microfono:', error);
        alert('Errore accesso microfono. Verifica i permessi.');
      }
    };

    const stopRecording = () => {
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        setIsRecording(false);
      }
    };

    const parseExcelFile = async (file: File): Promise<any[]> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
              raw: false,        // Converte le date in stringhe
              dateNF: 'dd/mm/yyyy'  // Formato date italiano
            });
            console.log('Dati parsati da Excel:', jsonData);
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        };
        
        reader.onerror = reject;
        reader.readAsBinaryString(file);
      });
    };

    const handleSendMessage = async () => {
      console.log("handleSendMessage chiamata");
      console.log("inputMessage:", inputMessage);
      console.log("uploadedFiles:", uploadedFiles);
      
      // Gestione Excel
      if (inputMessage.toLowerCase().includes('excel') || inputMessage.toLowerCase().includes('crea') && inputMessage.toLowerCase().includes('fattura')) {
        const messageToSend = inputMessage.trim();
        
        // Aggiungi messaggio utente
        const userMessage: Message = { 
          id: getUniqueMessageId(),
          text: messageToSend,
          isUser: true,
          timestamp: new Date(),
          type: 'normal'
        };
        
        setMessages(prev => [...prev, userMessage]);
        
        // Nascondi il messaggio di benvenuto quando viene inviato il primo messaggio
        if (messages.length === 0) {
          setShowWelcomeMessage(false);
        }
        
        // Aggiorna anche le conversazioni
        if (activeConversationId) {
          setConversationMessages(prev => ({
            ...prev,
            [activeConversationId]: [...(prev[activeConversationId] || []), userMessage]
          }));
        }
        
        setInputMessage('');
        
        // Check se l'utente vuole analizzare Excel per email
        if ((messageToSend.toLowerCase().includes('email') || 
             messageToSend.toLowerCase().includes('mail') ||
             messageToSend.toLowerCase().includes('invia') ||
             messageToSend.toLowerCase().includes('prepara')) && 
            uploadedFiles.length > 0 &&
            uploadedFiles[0].name.includes('.xls')) {
          
          await processExcelForEmails(uploadedFiles[0]);
          console.log("Uscita 1: Processo Excel per email (vecchio controllo)");
          return;
        }
        
        // Check se l'utente vuole email con dati temporanei (senza file Excel caricato)
        if ((messageToSend.toLowerCase().includes('email') || 
             messageToSend.toLowerCase().includes('mail') ||
             messageToSend.toLowerCase().includes('invia') ||
             messageToSend.toLowerCase().includes('prepara')) && 
            window.tempExcelData) {
          
          await processExcelForEmails(window.tempExcelData);
          console.log("Uscita 1.5: Processo Excel per email con dati temporanei");
          return;
        }
        
        // Reset altezza textarea
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = '40px';
          }
        }, 0);
        
        // Scroll immediato per messaggio utente
        setTimeout(() => {
          scrollToBottom();
        }, 100);
        
        try {
          const result = await excelService.createExcelFromRequest(messageToSend);
          
          const assistantMessage: Message = {
            id: getUniqueMessageId(),
            text: result.message,
            isUser: false,
            timestamp: new Date(),
            type: 'normal'
          };
          
          setMessages(prev => [...prev, assistantMessage]);
          
          // Aggiorna anche le conversazioni
          if (activeConversationId) {
            setConversationMessages(prev => ({
              ...prev,
              [activeConversationId]: [...(prev[activeConversationId] || []), assistantMessage]
            }));
          }
          
          // Scroll per risposta Excel
          setTimeout(() => {
            scrollToBottom();
          }, 100);
          
        } catch (error) {
          console.error('Errore Excel:', error);
          const errorMessage: Message = {
            id: getUniqueMessageId(),
            text: '❌ Errore nella creazione dell\'Excel. Riprova.',
            isUser: false,
            timestamp: new Date(),
            type: 'normal'
          };
          
          setMessages(prev => [...prev, errorMessage]);
          
          // Aggiorna anche le conversazioni per l'errore
          if (activeConversationId) {
            setConversationMessages(prev => ({
              ...prev,
              [activeConversationId]: [...(prev[activeConversationId] || []), errorMessage]
            }));
          }
          
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }
        
        console.log("Uscita 2: Fine gestione Excel");
        return;
      }
      
      // CONTROLLO CRITICO: Verifica che ci sia una chat attiva prima di procedere
      if (!activeConversationId) {
        console.warn('⚠️ Nessuna chat attiva disponibile, inizializzo il sistema chat...');
        
        // Tenta di garantire una chat attiva
        const activeChatId = ensureActiveChat();
        
        if (!activeChatId) {
          console.error('❌ Errore: Impossibile garantire una chat attiva per l\'invio del messaggio');
          
          // Mostra messaggio di errore all'utente
          const errorMessage: Message = {
            id: getUniqueMessageId(),
            text: 'Errore: Impossibile inizializzare la conversazione. Riprova.',
            isUser: false,
            timestamp: new Date(),
            type: 'normal'
          };
          
          setMessages(prev => [...prev, errorMessage]);
          
          // ✅ Scroll alla fine per messaggi di errore
          setTimeout(() => {
            scrollToBottom();
          }, 100);
          
          console.log("Uscita 3: Nessuna chat attiva, inizializzazione");
          return;
        }
        
        // console.log('✅ Chat attiva garantita per l\'invio del messaggio:', activeChatId);
      }
      
      // GARANTISCI SEMPRE UNA RISPOSTA - anche con messaggio vuoto
      const messageToSend = inputMessage.trim();

      // Controllo file Excel - VERSIONE SEMPLIFICATA
      if ((uploadedFiles.length > 0 && uploadedFiles[0].name.includes('.xls')) || window.tempExcelFile) {
        const file = uploadedFiles[0] || window.tempExcelFile;
        
        // Verifica che il file sia valido
        if (!file || !file.name) {
          console.log('File non valido:', file);
          return;
        }
        
        // Se preme solo invio con file - CHIEDI COSA VUOLE FARE
        if (!messageToSend) {
          // Messaggio di dialogo per chiedere cosa vuole fare
          const dialogMessage: Message = {
            id: getUniqueMessageId(),
            text: `📎 Ho rilevato il file Excel: **${file.name}**

Cosa preferisci fare?

🔍 **Analisi del file** - Analizzo i dati e ti spiego cosa contiene
📧 **Invia email** - Genero email personalizzate dai dati

Rispondi con:
• "analisi" o "analizza" per l'analisi del file
• "email" o "invia" per generare email`,
            isUser: false,
            timestamp: new Date(),
            type: 'normal'
          };
          setMessages(prev => [...prev, dialogMessage]);
          
          // Salva il file per le azioni successive
          window.tempExcelFile = file;
          
          setInputMessage('');
          // setUploadedFiles([]); // DISABILITATO - Fix per mantenere file disponibile
          return;
        }
        
        // Se scrive "analisi" o "analizza" - FA L'ANALISI DEL FILE
        if (messageToSend.toLowerCase().includes('analisi') || 
            messageToSend.toLowerCase().includes('analizza')) {
          
          const fileToAnalyze = window.tempExcelFile || file;
          console.log('Analisi richiesta - File disponibile:', fileToAnalyze?.name);
          
          if (fileToAnalyze) {
            setIsProcessingEmails(true);
            
            try {
              // Parse del file Excel con la nostra funzione
              const rawData = await parseExcelFile(fileToAnalyze);
              console.log('🔴 DEBUG EXCEL - FILE:', fileToAnalyze?.name);
              console.log('🔴 DEBUG EXCEL - DATI RAW:', rawData);
              
              // FILTRA RIGHE VUOTE E NOMI FAKE
              const data = rawData.filter(row => {
                const keys = Object.keys(row);
                const values = Object.values(row);
                
                // Elimina righe completamente vuote
                if (values.every(val => !val || val.toString().trim() === '')) return false;
                
                // Elimina righe con nomi fake come "EMPTY_1", "EMPTY_2", etc.
                const hasFakeNames = values.some(val => 
                  val && val.toString().match(/^(EMPTY_|empty_|test_|fake_|dummy_)\d*$/i)
                );
                if (hasFakeNames) return false;
                
                return true;
              });
              console.log('🔴 DEBUG EXCEL - DATI FILTRATI:', data);
              console.log('🔴 DEBUG EXCEL - WINDOW.TEMPEXCELFILE:', window.tempExcelFile);
              console.log('🔴 DEBUG EXCEL - UPLOADEDFILES:', uploadedFiles);
              
              // VERIFICA SE IL FILE HA DATI REALI
              if (!data || data.length === 0) {
                const emptyFileMessage: Message = {
                  id: getUniqueMessageId(),
                  text: `📎 **${fileToAnalyze.name}**

⚠️ **FILE VUOTO RILEVATO**

Il file Excel che hai caricato è vuoto o non contiene dati analizzabili.

**Possibili cause:**
• Il file è un template vuoto
• Il file contiene solo intestazioni senza dati
• Il file è corrotto o non leggibile

**Cosa puoi fare:**
• Carica un file Excel con dati reali
• Verifica che il file contenga informazioni nelle celle
• Controlla che il file non sia solo un modello

Vuoi provare con un altro file?`,
                  isUser: false,
                  timestamp: new Date(),
                  type: 'normal'
                };
                setMessages(prev => [...prev, emptyFileMessage]);
                setIsProcessingEmails(false);
                setInputMessage('');
                setUploadedFiles([]);
                window.tempExcelFile = undefined;
                return;
              }
              
              // VERIFICA SE È SOLO UN TEMPLATE (solo intestazioni)
              const hasRealData = data.some(row => {
                const values = Object.values(row);
                return values.some(value => 
                  value && 
                  value.toString().trim() !== '' && 
                  !value.toString().toLowerCase().includes('template') &&
                  !value.toString().toLowerCase().includes('esempio')
                );
              });
              
              if (!hasRealData) {
                const templateMessage: Message = {
                  id: getUniqueMessageId(),
                  text: `📎 **${fileToAnalyze.name}**

⚠️ **TEMPLATE RILEVATO**

Il file Excel che hai caricato sembra essere un template o modello vuoto.

**Contenuto rilevato:**
• Solo intestazioni di colonne
• Nessun dato reale nelle celle
• Possibili valori di esempio o placeholder

**Per un'analisi reale, carica un file con:**
• Dati reali nelle celle
• Informazioni concrete da analizzare
• Contenuto effettivo, non solo struttura

Vuoi provare con un file che contiene dati reali?`,
                  isUser: false,
                  timestamp: new Date(),
                  type: 'normal'
                };
                setMessages(prev => [...prev, templateMessage]);
                setIsProcessingEmails(false);
                setInputMessage('');
                setUploadedFiles([]);
                window.tempExcelFile = undefined;
                return;
              }
              
              // Debug: Log dei dati Excel prima di inviarli
              console.log('Dati Excel inviati a OpenRouter:', data);
              
              // Prepara prompt per OpenRouter con DATI REALI dal file Excel
              const analysisPrompt = `
Analizza questo file Excel REALE e capisci ESATTAMENTE cosa contiene.

INFORMAZIONI FILE:
Nome: ${fileToAnalyze.name}
Totale righe: ${data.length}

DATI REALI DAL FILE EXCEL:
${JSON.stringify(data, null, 2)}

ANALIZZA E SUGGERISCI AZIONI:
1. Identifica TUTTE le email valide nel file
2. Conta quanti record sono "Da inviare" vs "Inviata" vs "Fallita"
3. Se ci sono email da inviare, suggerisci di generare le comunicazioni
4. Se ci sono email fallite, suggerisci di verificare gli indirizzi
5. Se ci sono template diversi, analizza l'efficacia

IMPORTANTE: Usa SOLO i dati reali dal file. Non inventare nulla.
Concentrati su AZIONI PRATICHE che l'utente può fare subito.

TERMINA sempre con una domanda diretta su cosa fare.
`;
              console.log('🔴 PROMPT COMPLETO INVIATO:', analysisPrompt);
              
              // Verifica se il backend è disponibile
              const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://nyra-backend-c7zi.onrender.com';
              
              // La tab dinamica sarà mostrata dentro la chat
              
              let aiAnalysis: string;
              
              if (backendUrl) {
                // Mostra rettangolo dinamico che si aggiorna durante l'analisi
                // STEP 1: Solo nome file
                const fileDataMessage: Message = {
                  id: getUniqueMessageId(),
                  text: `📊 **${fileToAnalyze.name}**`,
                  isUser: false,
                  timestamp: new Date(),
                  type: 'excel-analysis',
                  status: 'analyzing'
                };
                setMessages(prev => [...prev, fileDataMessage]);
                
                // STEP 2: Aggiungi riepilogo dopo 500ms
                setTimeout(() => {
                  setMessages(prev => prev.map(msg => 
                    msg.id === fileDataMessage.id 
                      ? {
                          ...msg,
                          text: `📊 **${fileToAnalyze.name}**`
                        }
                      : msg
                  ));
                }, 500);
                
                // STEP 3: Aggiungi colonne dopo 1000ms
                setTimeout(() => {
                  setMessages(prev => prev.map(msg => 
                    msg.id === fileDataMessage.id 
                      ? {
                          ...msg,
                          text: `📊 **${fileToAnalyze.name}**

**📋 Struttura dati**
${Object.keys(data[0] || {}).map(col => `• ${col}`).join(' • ')}`
                        }
                      : msg
                  ));
                }, 1000);
                
                // STEP 4: Aggiungi anteprima dopo 1500ms
                setTimeout(() => {
                  setMessages(prev => prev.map(msg => 
                    msg.id === fileDataMessage.id 
                      ? {
                          ...msg,
                          text: `📊 **${fileToAnalyze.name}**
${(() => {
  const emails = data.filter(row => row.Email && row.Email.includes('@')).map(row => `${row.Nome || 'N/A'} ${row.Cognome || 'N/A'} (${row.Email})`);
  const pending = data.filter(row => row.Stato === 'Da inviare' || row.Stato === 'Pending');
  const sent = data.filter(row => row.Stato === 'Inviata' || row.Stato === 'Sent');
  const failed = data.filter(row => row.Stato === 'Fallita' || row.Stato === 'Failed');
  
  let result = '';
  if (emails.length > 0) result += `• ${emails.length} email trovate: ${emails.slice(0, 3).join(', ')}${emails.length > 3 ? '...' : ''}\n`;
  if (pending.length > 0) result += `• ${pending.length} da inviare\n`;
  if (sent.length > 0) result += `• ${sent.length} già inviate\n`;
  if (failed.length > 0) result += `• ${failed.length} fallite\n`;
  
  return result.trim();
})()}`
                        }
                      : msg
                  ));
                }, 1500);
                
                // DELAY per far vedere i dati
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // CHIAMATA REALE AL BACKEND
                const openRouterResponse = await fetch(`${backendUrl}/api/ai/chat`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    model: 'anthropic/claude-3.5-sonnet',
                    messages: [
                      {
                        role: 'system',
                        content: 'Sei NYRA, un assistente AI specializzato nell\'analisi di dati Excel aziendali. Analizza i dati e rispondi alle domande dell\'utente. Proponi azioni solo quando richiesto esplicitamente.'
                      },
                      {
                        role: 'user',
                        content: analysisPrompt
                      }
                    ],
                    temperature: 0.7,
                    max_tokens: 4000
                  })
                });

                const aiResult = await openRouterResponse.json();

                // I dati del file sono già stati mostrati nel rettangolo

                // Controlla se la risposta è valida
                if (!aiResult.choices || !aiResult.choices[0] || !aiResult.choices[0].message) {
                  throw new Error('Risposta API non valida');
                }

                aiAnalysis = aiResult.choices[0].message.content;
                
                // Aggiorna il rettangolo con l'analisi completa
                const updatedFileDataMessage: Message = {
                  id: fileDataMessage.id, // Stesso ID per aggiornare il messaggio esistente
                  text: `📊 **${fileToAnalyze.name}**
${(() => {
  const emails = data.filter(row => row.Email && row.Email.includes('@')).map(row => `${row.Nome || 'N/A'} ${row.Cognome || 'N/A'} (${row.Email})`);
  const pending = data.filter(row => row.Stato === 'Da inviare' || row.Stato === 'Pending');
  const sent = data.filter(row => row.Stato === 'Inviata' || row.Stato === 'Sent');
  const failed = data.filter(row => row.Stato === 'Fallita' || row.Stato === 'Failed');
  
  let result = '';
  if (emails.length > 0) result += `• ${emails.length} email trovate: ${emails.slice(0, 3).join(', ')}${emails.length > 3 ? '...' : ''}\n`;
  if (pending.length > 0) result += `• ${pending.length} da inviare\n`;
  if (sent.length > 0) result += `• ${sent.length} già inviate\n`;
  if (failed.length > 0) result += `• ${failed.length} fallite\n`;
  
  return result.trim();
})()}

${aiAnalysis}`,
                  isUser: false,
                  timestamp: new Date(),
                  type: 'excel-analysis',
                  status: 'completed'
                };
                
                // STEP 5: Aggiorna gradualmente l'analisi AI
                setTimeout(() => {
                  setMessages(prev => prev.map(msg => 
                    msg.id === fileDataMessage.id ? updatedFileDataMessage : msg
                  ));
                }, 2000);
              } else {
                // ANALISI LOCALE SENZA API
                const localMessage: Message = {
                  id: getUniqueMessageId(),
                  text: "📊 Analisi locale in corso...",
                  isUser: false,
                  timestamp: new Date(),
                  type: 'excel-analysis',
                  status: 'local'
                };
                setMessages(prev => [...prev, localMessage]);
                
                aiAnalysis = `
📊 ANALISI FILE EXCEL: ${fileToAnalyze.name}

Ho analizzato il tuo file Excel che contiene ${data.length} righe di dati.

DATI RILEVATI:
${data.slice(0, 3).map((row, i) => `Riga ${i+1}: ${JSON.stringify(row)}`).join('\n')}

AZIONI DISPONIBILI:
• Scrivi "email" per generare email personalizzate
• Scrivi "invia" per processare il file per email
                `;
              }
              
              // L'analisi è già stata aggiunta al rettangolo dinamico
              
              // Salva dati per azioni successive
              window.tempExcelData = data;
              console.log('Dati salvati in window.tempExcelData:', window.tempExcelData);
              
            } catch (error) {
              console.error('Errore analisi AI:', error);
              const errorMessage: Message = {
                id: getUniqueMessageId(),
                text: `Errore nell'analisi del file: ${error instanceof Error ? error.message : 'Errore sconosciuto'}. Verifica che il file Excel sia valido e contenga dati.`,
                isUser: false,
                timestamp: new Date(),
                type: 'normal'
              };
              setMessages(prev => [...prev, errorMessage]);
            } finally {
              setIsProcessingEmails(false);
              setInputMessage('');
              setUploadedFiles([]);
              window.tempExcelFile = undefined;
            }
            
            return;
          }
        }

        // Se scrive "genera" o "email" con file - USA DATI SALVATI
        if (messageToSend.toLowerCase().includes('email') || 
            messageToSend.toLowerCase().includes('genera') ||
            messageToSend.toLowerCase().includes('invia') ||
            messageToSend.toLowerCase().includes('prepara')) {
          
          if (window.tempExcelData) {
            // Genera email con i dati già analizzati
            await processExcelForEmails(window.tempExcelData);
            window.tempExcelData = null;
          } else {
            // Se non ci sono dati salvati, usa il file originale
            await processExcelForEmails(file);
          }
          
          setInputMessage('');
          setUploadedFiles([]);
          return;
        }
      }

      // SOLO SE NON CI SONO FILE, continua con il comportamento normale
      if (!messageToSend) {
        console.log("Uscita 6: Messaggio vuoto senza file");
        return;
      }

      // PURE CLAUDE LOGIC - Vai direttamente a Claude per tutte le risposte
      
      const userMessage: Message = { 
        id: getUniqueMessageId(),
        text: messageToSend,
        isUser: true,
        timestamp: new Date(),
        type: 'normal'
      };

      // 1. Crea una nuova history locale con il messaggio dell'utente
      const newHistory = [...messages, userMessage];
      
      // Nascondi il messaggio di benvenuto quando viene inviato il primo messaggio
      if (messages.length === 0) {
        setShowWelcomeMessage(false);
      }
      
      // TODO: Reactivate if needed to track the first message logic
      // setIsFirstMessage(false);
      
      // GARANTISCI SEMPRE UNA CHAT ATTIVA - LOGICA SEMPLIFICATA
      let currentChatId = activeConversationId;
      
      // Usa la funzione ensureActiveChat per garantire una chat attiva
      const activeChatId = ensureActiveChat();
      
      if (activeChatId) {
        // ✅ Chat attiva trovata o attivata
        currentChatId = activeChatId;
        // console.log('✅ Chat attiva garantita:', currentChatId);
      } else {
        // 🆕 Nessuna chat trovata - creane una nuova
        // CONTROLLO DIFENSIVO: Preveni doppia creazione chat
        if (chatCreationInProgress.current) {
          // console.log('⚠️ Creazione chat già in corso, uso chat esistente in handleSendMessage');
          // Non fare return, continua con la chiamata API usando la chat esistente
        } else {
          chatCreationInProgress.current = true;
          // console.log('🆕 Nessuna chat trovata, creo una nuova in handleSendMessage');
          
          const chatTitle = getConversationTitle(messageToSend);
          const uniqueChatName = generateUniqueChatName(chatTitle);
          
          const newChat: Chat = {
            id: generateGuaranteedUniqueId(),
            name: uniqueChatName,
            lastMessage: messageToSend,
            timestamp: new Date(),
            isActive: true
          };
          
          addChatSafely(newChat);
          
          currentChatId = newChat.id;
          setActiveConversationId(currentChatId);
          setConversationCounter(prev => prev + 1);
          
          // Reset counter se necessario
          setTimeout(() => {
            resetCounterIfNeeded();
          }, 100);
          
          // Reset flag dopo un breve delay
          setTimeout(() => {
            chatCreationInProgress.current = false;
          }, 500);
          
          // console.log('✅ Nuova conversazione creata in handleSendMessage:', currentChatId, uniqueChatName);
        }
      }

      // Update conversation messages
      setConversationMessages(prev => ({
        ...prev,
        [currentChatId!]: [...(prev[currentChatId!] || []), userMessage]
      }));

      setMessages(prev => [...prev, userMessage]);
      
      // 2. Controlla se il messaggio contiene parole chiave per i reminder - DEVE ESSERE PRIMA DI TUTTO
      if (detectReminderKeywords(messageToSend)) {
        
        // Esegui createReminder in parallelo senza interrompere la chiamata LLM
        const { createReminder } = await import('./services/n8nIntegration');
        const userName = getCurrentUserName();
        
        createReminder(messageToSend, 'user', userName)
                        .then(result => {
                          if (result.success && result.eventLink) {
                            // Aggiungi messaggio di conferma con link all'evento
                            const successMessage: Message = {
                              id: getUniqueMessageId(),
                              text: `✅ Promemoria impostato. [Apri evento](${result.eventLink})`,
                              isUser: false,
                              timestamp: new Date(),
                              type: 'normal'
                            };

                            setMessages(prev => [...prev, successMessage]);
                            setConversationMessages(prev => ({
                              ...prev,
                              [currentChatId!]: [...(prev[currentChatId!] || []), successMessage]
                            }));
                            
                            // ✅ Scroll alla fine per messaggi di successo reminder
                            setTimeout(() => {
                              scrollToBottom();
                            }, 100);
                          } else if (result.success) {
                            // Aggiungi messaggio di conferma locale
                            const successMessage: Message = {
                              id: getUniqueMessageId(),
                              text: '✅ Reminder creato nel tuo calendario!',
                              isUser: false,
                              timestamp: new Date(),
                              type: 'normal'
                            };

                            setMessages(prev => [...prev, successMessage]);
                            setConversationMessages(prev => ({
                              ...prev,
                              [currentChatId!]: [...(prev[currentChatId!] || []), successMessage]
                            }));
                            
                            // ✅ Scroll alla fine per messaggi di successo reminder
                            setTimeout(() => {
                              scrollToBottom();
                            }, 100);
                          } else {
                            // Aggiungi messaggio di warning locale
                            const warningMessage: Message = {
                              id: getUniqueMessageId(),
                              text: `⚠️ Servizio reminder temporaneamente non disponibile: ${result.error || 'Errore sconosciuto'}`,
                              isUser: false,
                              timestamp: new Date(),
                              type: 'normal'
                            };

                            setMessages(prev => [...prev, warningMessage]);
                            setConversationMessages(prev => ({
                              ...prev,
                              [currentChatId!]: [...(prev[currentChatId!] || []), warningMessage]
                            }));
                            
                            // ✅ Scroll alla fine per messaggi di warning reminder
                            setTimeout(() => {
                              scrollToBottom();
                            }, 100);
                          }
                        })
                        .catch(error => {
                          console.error('Errore reminder:', error);
                          // Aggiungi messaggio di warning locale
                          const warningMessage: Message = {
                            id: getUniqueMessageId(),
                              text: '⚠️ Servizio reminder temporaneamente non disponibile',
                              isUser: false,
                              timestamp: new Date(),
                              type: 'normal'
                            };

                            setMessages(prev => [...prev, warningMessage]);
                            setConversationMessages(prev => ({
                              ...prev,
                              [currentChatId!]: [...(prev[currentChatId!] || []), warningMessage]
                            }));
                            
                            // ✅ Scroll alla fine per messaggi di warning reminder
                            setTimeout(() => {
                              scrollToBottom();
                            }, 100);
                          });
      }
      
      setInputMessage('');
      
      // ✅ Scroll alla fine quando viene inviato un messaggio
      setTimeout(() => {
        scrollToBottom();
      }, 100);
      
      // Set thinking state to true before API call
      setIsThinking(true);
      
      // Reset altezza textarea
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = '40px';
        }
      }, 0);

      // Hide welcome message on first user message
      if (showWelcomeMessage) {
        setShowWelcomeMessage(false);
      }

      // CONTROLLO: Verifica che currentChatId sia valido
      // console.log('🔍 DEBUG: currentChatId prima del controllo:', currentChatId);
      if (!currentChatId) {
        console.error('❌ Errore: Nessuna chat attiva trovata per la chiamata API');
        // console.log('🔍 DEBUG: activeConversationId:', activeConversationId);
        // console.log('🔍 DEBUG: chats.length:', chats.length);
        // console.log('🔍 DEBUG: chats:', chats);
        console.log("Uscita 7: Nessuna chat attiva per API");
        return;
      }
      // console.log('✅ DEBUG: currentChatId valido:', currentChatId);

      // ✅ NUOVO SISTEMA: Usa OpenRouter direttamente per risposte naturali
      try {
        console.log('🔗 Avvio sistema OpenRouter per:', messageToSend);
        
        // Inizializza OpenRouter se non esiste ancora
        if (!window.openRouter) {
          const { OpenRouterConnector } = await import('./services/openrouter');
          window.openRouter = new OpenRouterConnector();
        }
        
        // 3. L'LLM riceve la history completa usando newHistory
        const finalResponse = await window.openRouter.sendMessage(messageToSend, newHistory);
              
        // Set thinking state to false after response is received
        setIsThinking(false);
        
        // GESTIONE RISPOSTA FINALE
        if (finalResponse) {
          // 🔍 INTERCETTAZIONE AZIONI CALENDARIO (solo se non già gestito dalle azioni multiple)
          if (!finalResponse.includes('"action"')) {
            const maybeCalendarAction = safeParseJSON(finalResponse);
            if (maybeCalendarAction && isCalendarAction(maybeCalendarAction)) {
            console.log('[NYRA] Intercettata azione calendario:', maybeCalendarAction);
            
            // Normalizza e crea payload per n8n
            const payload = createN8NPayload(maybeCalendarAction);
            console.log('[NYRA][TITLE] user:', maybeCalendarAction.originalText);
            console.log('[NYRA][TITLE] model summary/title:', maybeCalendarAction?.summary, maybeCalendarAction?.title);
            console.log('[NYRA][TITLE] final:', payload.summary);
            console.log('[NYRA] Dispatching calendar event to n8n:', payload);
            
            try {
              // Usa la nuova funzione per n8n con payload diretto
              const { createCalendarEvent } = await import('./services/n8nIntegration');
              
              const res = await createCalendarEvent(maybeCalendarAction);
              
              console.log('[NYRA] n8n OK', res);
              
              // Formatta le date usando i dati reali dell'evento creato
              let startFormatted, endFormatted;
              
              // Importa le funzioni del nuovo servizio time.ts
              const { formatDateTimeIT, getLocalTZ } = await import('./services/time');
              
              if (res.data?.start?.dateTime && res.data?.end?.dateTime) {
                // Usa i dati reali dell'evento con timezone
                const tz = res.data.start.timeZone || getLocalTZ();
                const startISO = res.data.start.dateTime;
                const endISO = res.data.end.dateTime;
                
                try {
                  // Formatta le date usando il nuovo servizio
                  const start = new Date(startISO);
                  const end = new Date(endISO);
                  
                  startFormatted = formatDateTimeIT(start, tz);
                  endFormatted = formatDateTimeIT(end, tz);
                  
                  console.log('[NYRA][CONFIRM] Evento reale:', { 
                    title: res.data.summary, 
                    start: startISO, 
                    end: endISO,
                    timeZone: tz,
                    startFormatted,
                    endFormatted
                  });
                } catch (formatError) {
                  console.warn('[NYRA] Errore formattazione date evento, fallback a payload:', formatError);
                  // Fallback alle date inviate
                  const { formatDateEuropeRome } = await import('./services/calendarDates');
                  startFormatted = formatDateEuropeRome(payload.startISO);
                  endFormatted = formatDateEuropeRome(payload.endISO);
                }
              } else {
                // Fallback alle date inviate se non ci sono dati evento
                const { formatDateEuropeRome } = await import('./services/calendarDates');
                startFormatted = formatDateEuropeRome(payload.startISO);
                endFormatted = formatDateEuropeRome(payload.endISO);
                
                console.log('[NYRA][CONFIRM] Fallback a payload:', { 
                  title: payload.summary, 
                  startISO: payload.startISO, 
                  endISO: payload.endISO 
                });
              }
              
              // Messaggio di conferma contestuale da n8n
              let successText: string;
              
              // Se n8n ha inviato una risposta contestuale, usala
              if (res.data?.message) {
                successText = res.data.message;
              } else {
                // Fallback al messaggio precompilato se n8n non ha inviato risposta
                successText = `✅ Evento creato: "${res.data?.summary || payload.summary}" (${startFormatted} → ${endFormatted})`;
              }
              
              const successMessage: Message = {
                id: getUniqueMessageId(),
                text: successText,
                isUser: false,
                timestamp: new Date(),
                type: 'normal'
              };
              
              setMessages(prev => [...prev, successMessage]);
              setConversationMessages(prev => ({
                ...prev,
                [currentChatId!]: [...(prev[currentChatId!] || []), successMessage]
              }));
              
              // Scroll alla fine per messaggio di successo
              setTimeout(() => {
                scrollToBottom();
              }, 100);
              
              console.log("Uscita 8: Successo n8n, interrompo catena chatbot");
              return; // Interrompi la catena "chatbot"
            } catch (err: any) {
              console.error('[NYRA] n8n FAILED', err?.message || err);
              
              const errorMessage: Message = {
                id: getUniqueMessageId(),
                text: '⚠️ Errore nel creare l\'evento. Riprovo più tardi o fallo manualmente.',
                isUser: false,
                timestamp: new Date(),
                type: 'normal'
              };
              
              setMessages(prev => [...prev, errorMessage]);
              setConversationMessages(prev => ({
                ...prev,
                [currentChatId!]: [...(prev[currentChatId!] || []), errorMessage]
              }));
              
              // Scroll alla fine per messaggio di errore
              setTimeout(() => {
                scrollToBottom();
              }, 100);
              
              console.log("Uscita 9: Errore n8n, interrompo catena chatbot");
              return; // Interrompi la catena "chatbot"
            }
          }
        }
          
          // 🔍 INTERCETTAZIONE AZIONI MULTIPLE (email + calendario) - FORMATO CORRETTO
          if (finalResponse.includes('"action"')) {
            console.log('🔍 Multiple actions detected in response');
            console.log('🔍 Final response contains action:', finalResponse.includes('"action"'));
            
            try {
              // Usa regex più robusta per trovare JSON completi
              const jsonRegex = /\{[^{}]*(?:"[^"]*"[^{}]*)*"action"[^{}]*(?:"[^"]*"[^{}]*)*\}/gs;
              const jsonMatches = finalResponse.match(jsonRegex);
              
              console.log('🔍 Debug regex:', {
                finalResponse: finalResponse.substring(0, 200) + '...',
                jsonMatches: jsonMatches,
                hasAction: finalResponse.includes('"action"')
              });
              
              if (jsonMatches && jsonMatches.length > 0) {
                console.log(`📋 Found ${jsonMatches.length} action(s):`, jsonMatches);
                
                let emailActions = []; // Array per multiple email
                let calendarAction = null;
                let readEmailAction = null;
                let emailManageAction = null;
                let emailSearchAction = null;
                let emailNotificationAction = null;
                let meetLink = null;
                
                // Processa ogni JSON trovato
                for (const jsonString of jsonMatches) {
                  try {
                    // Pulisce caratteri di controllo che possono rompere il JSON
                    const cleanJsonString = jsonString
                      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Rimuove caratteri di controllo
                      .replace(/\n/g, '\\n') // Escape newline
                      .replace(/\r/g, '\\r') // Escape carriage return
                      .replace(/\t/g, '\\t'); // Escape tab
                    
                    const action = JSON.parse(cleanJsonString);
                    console.log('🔍 Processing action:', action);
                    
                    if (action.action === 'send-email') {
                      emailActions.push(action); // Aggiungi all'array
                    } else if (action.action === 'create-calendar-event') {
                      calendarAction = action;
                    } else if (action.action === 'read-email') {
                      readEmailAction = action;
                    } else if (action.action === 'email-manage') {
                      emailManageAction = action;
                    } else if (action.action === 'email-search') {
                      emailSearchAction = action;
                    } else if (action.action === 'email-notifications') {
                      emailNotificationAction = action;
                    }
                  } catch (parseError) {
                    console.warn('⚠️ Failed to parse JSON:', jsonString, parseError);
                  }
                }
                
                // Processa calendario PRIMA se presente (per ottenere meetLink)
                if (calendarAction) {
                  console.log('📅 Processing calendar action first:', calendarAction);
                  
                  try {
                    // Crea payload per calendario con Meet
                    const calendarPayload = {
                      action_type: 'calendar',
                      title: calendarAction.summary || calendarAction.title,
                      startISO: calendarAction.startISO || calendarAction.start,
                      endISO: calendarAction.endISO || calendarAction.end,
                      originalText: calendarAction.originalText || '',
                      addMeet: true, // aggiunge Google Meet
                      user_id: currentUser?.email || 'anonymous'
                    };
                    
                    console.log('📅 Calendar payload:', calendarPayload);
                    
                    // Invia calendario a n8n
                    const { createCalendarEvent } = await import('./services/n8nIntegration');
                    const calendarResult = await createCalendarEvent(calendarAction);
                    
                    console.log('✅ Calendar created:', calendarResult);
                    
                    // Estrai meetLink se presente
                    if (calendarResult.data?.meetLink) {
                      meetLink = calendarResult.data.meetLink;
                      console.log('🔗 Meet link extracted:', meetLink);
                    }
                    
                  } catch (calendarError) {
                    console.error('❌ Calendar creation failed:', calendarError);
                  }
                }
                
                // Processa email DOPO se presente
                if (emailActions.length > 0) {
                  console.log(`📧 Processing ${emailActions.length} email action(s):`, emailActions);
                  
                  // Prepara array di email per preview
                  const emailDataArray = emailActions.map(emailAction => {
                    // Aggiungi meetLink al body dell'email se disponibile
                    let emailBody = emailAction.body || '';
                    if (meetLink && calendarAction) {
                      emailBody += `\n\n🔗 Link per la riunione: ${meetLink}`;
                      console.log('🔗 Added meet link to email body');
                    }
                    
                    return {
                      email: Array.isArray(emailAction.to) ? emailAction.to[0] : emailAction.to,
                      subject: emailAction.subject || 'Messaggio da NYRA',
                      body: emailBody
                    };
                  });
                  
                  console.log('📧 Email data prepared for preview:', emailDataArray);
                  
                  // Salva i dati email per l'invio successivo dopo consenso utente
                  window.tempEmailData = emailDataArray;
                  
                  // Mostra email preview per multiple email
                  setEmailPreviewData({
                    categorizedEmails: emailDataArray,
                    summary: `${emailDataArray.length} email personalizzate`
                  });
                  setShowEmailPreview(true);
                  
                  // NON INVIA AUTOMATICAMENTE - Solo mostra preview
                  // L'invio avverrà solo dopo consenso utente tramite EmailPreview component
                  console.log('⏸️ Email NOT sent automatically - waiting for user consent');
                }
                
                // Processa lettura email se presente
                if (readEmailAction) {
                  console.log('📖 Processing read email action:', readEmailAction);
                  
                  try {
                    // Usa il servizio email diretto invece di n8n
                    const { emailReadService } = await import('./services/emailReadService');
                    const readEmailResult = await emailReadService.readEmails(readEmailAction);
                    console.log('✅ Read email result:', readEmailResult);
                    
                    // Se la lettura è riuscita, mostra i risultati
                    if (readEmailResult.success && readEmailResult.emails.length > 0) {
                      const emailType = readEmailAction.type || 'ultime';
                      const emailCount = readEmailResult.count;
                      const requestedCount = readEmailAction.count || 5;
                      
                      let emailSummary = `📧 ${emailCount} ${emailType} email trovate:\n\n`;
                      
                      // Mostra tutte le email (fino a 10 per non appesantire la chat)
                      const emailsToShow = readEmailResult.emails.slice(0, Math.min(10, emailCount));
                      
                      emailsToShow.forEach((email, index) => {
                        const date = new Date(email.date).toLocaleString('it-IT');
                        emailSummary += `${index + 1}. 📨 **${email.subject}**\n` +
                          `   👤 Da: ${email.from}\n` +
                          `   📅 ${date}\n` +
                          `   📝 ${email.snippet}\n`;
                        
                        // Mostra contenuto completo se disponibile e richiesto
                        if (email.body && email.body.length > email.snippet.length) {
                          emailSummary += `   📄 **Contenuto completo:**\n   ${email.body.substring(0, 500)}${email.body.length > 500 ? '...' : ''}\n`;
                        }
                        
                        emailSummary += `\n`;
                      });
                      
                      if (emailCount > 10) {
                        emailSummary += `... e altre ${emailCount - 10} email.\n\n`;
                      }
                      

                      

                      
                      // Aggiungi messaggio con i risultati email
                      const emailResultMessage: Message = {
                        id: getUniqueMessageId(),
                        text: emailSummary,
                        isUser: false,
                        timestamp: new Date(),
                        type: 'normal'
                      };
                      
                      setMessages(prev => [...prev, emailResultMessage]);
                      setConversationMessages(prev => ({
                        ...prev,
                        [currentChatId!]: [...(prev[currentChatId!] || []), emailResultMessage]
                      }));
                    }
                    

                    
                  } catch (readEmailError) {
                    console.error('❌ Read email failed:', readEmailError);
                  }
                }
                
                // Processa gestione email se presente
                if (emailManageAction) {
                  console.log('🔧 Processing email management action:', emailManageAction);
                  
                  try {
                    const { emailManagementService } = await import('./services/emailManagementService');
                    const manageResult = await emailManagementService.manageEmail(emailManageAction);
                    console.log('✅ Email management result:', manageResult);
                    
                    if (manageResult.success) {
                      // Aggiungi messaggio di conferma
                      const manageMessage: Message = {
                        id: getUniqueMessageId(),
                        text: `✅ ${manageResult.message}`,
                        isUser: false,
                        timestamp: new Date(),
                        type: 'normal'
                      };
                      
                      setMessages(prev => [...prev, manageMessage]);
                      setConversationMessages(prev => ({
                        ...prev,
                        [currentChatId!]: [...(prev[currentChatId!] || []), manageMessage]
                      }));
                    }
                    
                  } catch (manageError) {
                    console.error('❌ Email management failed:', manageError);
                  }
                }
                
                // Processa ricerca email se presente
                if (emailSearchAction) {
                  console.log('🔍 Processing email search action:', emailSearchAction);
                  
                  try {
                    const { emailManagementService } = await import('./services/emailManagementService');
                    const searchResult = await emailManagementService.searchEmails(emailSearchAction);
                    console.log('✅ Email search result:', searchResult);
                    
                    if (searchResult.success && searchResult.emails.length > 0) {
                      let searchSummary = `🔍 ${searchResult.count} email trovate per "${emailSearchAction.query}":\n\n`;
                      
                      const emailsToShow = searchResult.emails.slice(0, Math.min(10, searchResult.count));
                      
                      emailsToShow.forEach((email, index) => {
                        const date = new Date(email.date).toLocaleString('it-IT');
                        searchSummary += `${index + 1}. 📨 **${email.subject}**\n` +
                          `   👤 Da: ${email.from}\n` +
                          `   📅 ${date}\n` +
                          `   📝 ${email.snippet}\n\n`;
                      });
                      
                      if (searchResult.count > 10) {
                        searchSummary += `... e altre ${searchResult.count - 10} email.\n\n`;
                      }
                      
                      // Aggiungi messaggio con i risultati ricerca
                      const searchMessage: Message = {
                        id: getUniqueMessageId(),
                        text: searchSummary,
                        isUser: false,
                        timestamp: new Date(),
                        type: 'normal'
                      };
                      
                      setMessages(prev => [...prev, searchMessage]);
                      setConversationMessages(prev => ({
                        ...prev,
                        [currentChatId!]: [...(prev[currentChatId!] || []), searchMessage]
                      }));
                    }
                    
                  } catch (searchError) {
                    console.error('❌ Email search failed:', searchError);
                  }
                }
                
                // Processa notifiche email se presente
                if (emailNotificationAction) {
                  console.log('🔔 Processing email notification action:', emailNotificationAction);
                  
                  try {
                    const { emailNotificationService } = await import('./services/emailNotificationService');
                    const notificationResult = await emailNotificationService.configureNotifications(emailNotificationAction);
                    console.log('✅ Email notification result:', notificationResult);
                    
                    if (notificationResult.success) {
                      // Aggiungi messaggio di conferma
                      const notificationMessage: Message = {
                        id: getUniqueMessageId(),
                        text: `🔔 ${notificationResult.message}`,
                        isUser: false,
                        timestamp: new Date(),
                        type: 'normal'
                      };
                      
                      setMessages(prev => [...prev, notificationMessage]);
                      setConversationMessages(prev => ({
                        ...prev,
                        [currentChatId!]: [...(prev[currentChatId!] || []), notificationMessage]
                      }));
                    }
                    
                  } catch (notificationError) {
                    console.error('❌ Email notification failed:', notificationError);
                  }
                }
                

                
                // Genera messaggio di conferma naturale appropriato
                let confirmationMessage = '';
                
                if (calendarAction) {
                  confirmationMessage = `📅 Evento calendario creato: "${calendarAction.summary || calendarAction.title}"`;
                  
                  if (meetLink) {
                    confirmationMessage += `\n🔗 Link Meet: ${meetLink}`;
                  }
                } else if (readEmailAction) {
                  const emailType = readEmailAction.type || 'ultime';
                  confirmationMessage = `📧 Email controllate con successo.`;
                } else if (emailManageAction) {
                  confirmationMessage = `🔧 Operazione email completata.`;
                } else if (emailSearchAction) {
                  confirmationMessage = `🔍 Ricerca email completata. I risultati sono mostrati sopra.`;
                } else if (emailNotificationAction) {
                  confirmationMessage = `🔔 Configurazione notifiche completata.`;
                }
                
                // Gestisci combinazioni multiple
                if (readEmailAction && calendarAction) {
                  confirmationMessage += `\n\n📧 Email controllate con successo.`;
                }
                
                if (emailManageAction || emailSearchAction || emailNotificationAction) {
                  confirmationMessage += `\n\n🔧 Operazioni email completate.`;
                }
                
                // Aggiungi messaggio di conferma
                const successMessage: Message = {
                  id: getUniqueMessageId(),
                  text: confirmationMessage,
                  isUser: false,
                  timestamp: new Date(),
                  type: 'normal'
                };
                
                setMessages(prev => [...prev, successMessage]);
                setConversationMessages(prev => ({
                  ...prev,
                  [currentChatId!]: [...(prev[currentChatId!] || []), successMessage]
                }));
                
                // Scroll alla fine per messaggio di successo
                setTimeout(() => {
                  scrollToBottom();
                }, 100);
                
                console.log("Uscita 10: Successo azione multipla, blocco JSON");
                return; // BLOCCA IL JSON DAL MOSTRARSI
              }
            } catch (error) {
              console.error('❌ Error processing multiple actions:', error);
              // Se c'è errore, lascia che mostri la risposta normale
            }
          }
          
          // 🔍 INTERCETTAZIONE AZIONI COMBINATE (calendario + email)
          if (finalResponse.includes('"type":"calendar"') && finalResponse.includes('"attendees"')) {
            const calendarAction = safeParseJSON(finalResponse);
            if (calendarAction && typeof calendarAction === 'object' && 'attendees' in calendarAction && Array.isArray(calendarAction.attendees) && calendarAction.attendees.length > 0) {
              console.log('📅✉️ Calendar with invites detected');
              
              // Il calendario con inviti viene già gestito dal blocco calendario sopra
              // Ma possiamo aggiungere logica extra qui se necessario
            }
          }
          
          // Se non è un'azione calendario, procedi normalmente
          const aiMessage: Message = {
            id: getUniqueMessageId(),
            text: finalResponse,
            isUser: false,
            timestamp: new Date(),
            type: 'normal'
          };
          
          setMessages(prev => [...prev, aiMessage]);
          setConversationMessages(prev => ({
            ...prev,
            [currentChatId!]: [...(prev[currentChatId!] || []), aiMessage]
          }));
          
          // ✅ Scroll alla fine quando arriva la risposta dell'AI
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        } else {
          // Fallback se non c'è risposta
          const fallbackMessage: Message = {
            id: getUniqueMessageId(),
            text: 'Mi dispiace, non sono riuscito a elaborare la richiesta. Riprova.',
            isUser: false,
            timestamp: new Date(),
            type: 'normal'
          };
          
          setMessages(prev => [...prev, fallbackMessage]);
          setConversationMessages(prev => ({
            ...prev,
            [currentChatId!]: [...(prev[currentChatId!] || []), fallbackMessage]
          }));
          
          // ✅ Scroll alla fine anche per messaggi di fallback
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }
      } catch (error) {
        console.error('Errore sistema N8N:', error);
        
        // Set thinking state to false on error
        setIsThinking(false);
        
        // Fallback di emergenza
        const fallbackMessage: Message = {
          id: getUniqueMessageId(),
          text: 'Servizio temporaneamente non disponibile. Riprova tra poco.',
          isUser: false,
          timestamp: new Date(),
          type: 'normal'
        };
        
        setMessages(prev => [...prev, fallbackMessage]);
        setConversationMessages(prev => ({
          ...prev,
          [currentChatId!]: [...(prev[currentChatId!] || []), fallbackMessage]
        }));
        
        // ✅ Scroll alla fine anche per messaggi di errore
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    };

    // Funzione per processare Excel per email
    const processExcelForEmails = async (file: File) => {
      setIsProcessingEmails(true);
      setShowEmailPreview(false);
      
      try {
        // Leggi il file Excel
        const rawData = await analyzeExcelForEmails(file);
        
        // USA L'AI PER GENERARE EMAIL REALI
        const recentMessages = messages.slice(-5).map(m => `${m.isUser ? 'Utente' : 'NYRA'}: ${m.text}`).join('\n');
        
        const aiPrompt = `
        CONTESTO CONVERSAZIONE RECENTE:
        ${recentMessages}
        
        DATI EXCEL REALI:
        ${JSON.stringify(rawData.categorizedEmails)}
        
        IMPORTANTE: Basandoti sulla conversazione recente, interpreta la richiesta dell'utente per determinare quante email generare:
        - Se l'utente dice "invia mail a tutti" o "entrambi" → genera email per TUTTI i destinatari nel file
        - Se l'utente dice "invia mail a [nome specifico]" → genera email solo per quel destinatario
        - Se l'utente dice "invia X mail" o "due mail" → genera esattamente X email
        - Se l'utente dice "invia mail" senza specificare → genera email per TUTTI i destinatari
        
        Per ogni destinatario selezionato genera un'email personalizzata usando i dati VERI.
        Se vedi "scaduto" fai un sollecito.
        Se c'è un importo fai una fattura.
        USA I NOMI REALI dal file.
        
        Rispondi SOLO in JSON con un array di email:
        [{
          "email": "email dal file",
          "subject": "oggetto specifico",
          "body": "testo personalizzato con dati reali"
        }, {
          "email": "seconda email dal file",
          "subject": "oggetto specifico",
          "body": "testo personalizzato con dati reali"
        }]`;
        
        // Inizializza OpenRouter se non esiste ancora
        if (!window.openRouter) {
          const { OpenRouterConnector } = await import('./services/openrouter');
          window.openRouter = new OpenRouterConnector();
        }
        
        const aiResponse = await window.openRouter.sendMessage(aiPrompt, []);
        
        console.log('Risposta AI:', aiResponse);
        
        let generatedEmails;
        try {
          // Se la risposta contiene già le email
          if (aiResponse && typeof aiResponse === 'object' && 'categorizedEmails' in aiResponse) {
            generatedEmails = (aiResponse as any).categorizedEmails;
          } else if (typeof aiResponse === 'string') {
            const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
            generatedEmails = jsonMatch ? JSON.parse(jsonMatch[0]) : rawData.categorizedEmails;
          } else {
            generatedEmails = rawData.categorizedEmails;
          }
          
          // Assicurati che abbiano subject e body
          generatedEmails = generatedEmails.map((email: any) => ({
            ...email,
            subject: email.subject || email.suggestedSubject || `Email per ${email.nome}`,
            body: email.body || email.suggestedBody || `Email automatica per ${email.email}`
          }));
          
        } catch (e) {
          console.error('Parsing fallito:', e);
          generatedEmails = rawData.categorizedEmails;
        }
        
        setEmailPreviewData({
          categorizedEmails: generatedEmails,
          summary: `${generatedEmails.length} email personalizzate`
        });
        setShowEmailPreview(true);
        
        const assistantMessage: Message = {
          id: getUniqueMessageId(),
          text: `Ho generato ${generatedEmails.length} email personalizzate con i dati reali del file`,
          isUser: false,
          timestamp: new Date(),
          type: 'normal'
        };
        setMessages(prev => [...prev, assistantMessage]);
        
      } catch (error) {
        console.error('Errore:', error);
        showError('Errore elaborazione');
      } finally {
        setIsProcessingEmails(false);
        setUploadedFiles([]);
      }
    };

    // Funzione per inviare le email
    const handleSendEmails = async (selectedIndexes: number[], modifiedEmails?: any[]) => {
      if (!emailPreviewData) return;
      
      try {
        const emailsToSend = selectedIndexes.map(i => 
          modifiedEmails ? modifiedEmails[i] : emailPreviewData.categorizedEmails[i]
        );
        
        // INVIO REALE VIA GMAIL DIRETTO
        console.log('📧 Invio email via Gmail diretto:', emailsToSend);
        
        // Importa il servizio Gmail diretto
        const { gmailDirectService } = await import('./services/gmailDirectService');
        
        // Invia ogni email via Gmail diretto
        for (const emailData of emailsToSend) {
          try {
            console.log('🚀 Invio email a:', emailData.email);
            await gmailDirectService.sendEmail(emailData);
            console.log('✅ Email inviata con successo a:', emailData.email);
          } catch (error) {
            console.error('❌ Errore invio email a', emailData.email, ':', error);
            throw error; // Rilancia l'errore per gestirlo
          }
        }
        
        showSuccess(`${emailsToSend.length} email inviate con successo via Gmail!`);
        setShowEmailPreview(false);
        setEmailPreviewData(null);
        
        // Aggiungi conferma in chat
        const confirmMessage: Message = {
          id: getUniqueMessageId(),
          text: `✅ Ho inviato ${emailsToSend.length} email con successo!`,
          isUser: false,
          timestamp: new Date(),
          type: 'normal'
        };
        setMessages(prev => [...prev, confirmMessage]);
        
      } catch (error) {
        showError('Errore nell\'invio delle email');
      }
    };

    
    // N8N System - Search query interpretation removed
    
    // Funzione per eseguire ricerche web
    // handleUserIntent function removed - replaced by conversationalAutomationManager

    // N8N System - Web search function removed
    //   // Add action to history
    //   const newAction: Action = {
    //     id: getUniqueMessageId() + '_action',
    //     description: actionDescription,
    //     timestamp: new Date(),
    //     conversationId: currentChatId,
    //     conversationTitle: chatTitle
    //   };
      
    //   setActions(prevActions => [newAction, ...prevActions]);
      
    //   setIsFirstMessage(false);
    // }, 500); // Reduced delay for efficiency

    // N8N System - Funzioni di supporto obsolete rimosse

    // Auto-scroll per il messaggio di benvenuto
    useEffect(() => {
      if (messages.length === 0 && activeConversationId && appClock) {
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ 
              behavior: 'smooth',
              block: 'end'
            });
          }
        }, 100);
      }
    }, [messages.length, activeConversationId, appClock]);

    return (
      <div className="app">
        {/* Toast System */}
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={removeToast}
            duration={toast.duration}
          />
        ))}
        
        {/* Welcome Screen */}
        {shouldShowWelcome ? (
        <div className="unified-welcome-screen">
          <div className="unified-welcome-overlay">
            <div className="unified-welcome-container">
              {/* Left Column - Welcome Content */}
              <div className="unified-welcome-left">
                <h1 className="unified-welcome-title">Welcome to NYRA</h1>
                <p className="unified-welcome-subtitle">
                  Your personal AI assistant to write, plan, organize and automate on your computer.
                </p>
                
                <div className="unified-welcome-features">
                  <div className="unified-welcome-feature">
                    <Check className="unified-welcome-feature-icon" size={16} />
                    <span>Write faster with AI assistance</span>
                  </div>
                  <div className="unified-welcome-feature">
                    <Check className="unified-welcome-feature-icon" size={16} />
                    <span>Organize files and apps with voice</span>
                  </div>
                  <div className="unified-welcome-feature">
                    <Check className="unified-welcome-feature-icon" size={16} />
                    <span>Schedule events with one sentence</span>
                  </div>
                  <div className="unified-welcome-feature">
                    <Check className="unified-welcome-feature-icon" size={16} />
                    <span>Full local privacy, cloud intelligence</span>
                  </div>
                </div>
                
                <div className="unified-welcome-tagline">
                  Everything on your desktop, finally connected.
                </div>
              </div>
              
              {/* Right Column - Registration Panel */}
              <div className="unified-welcome-right">
                <div className="unified-registration-panel">
                  <div className="unified-registration-header">
                    <div className="unified-registration-logo">
                      <span className="logo-text">Nyra</span>
                    </div>
                    <h2 className="unified-registration-title">
                      {isLogin ? 'Welcome back' : 'Get started'}
                    </h2>
                  </div>
                  
                  <form onSubmit={handleRegistrationSubmit} className="unified-registration-form">
                    {!isLogin && (
                      <div className="unified-registration-field">
                        <label>Username</label>
                        <input
                          type="text"
                          value={registrationData.username}
                          onChange={(e) => handleRegistrationInputChange('username', e.target.value)}
                          placeholder="Your username"
                          required
                        />
                      </div>
                    )}
                    
                    <div className="unified-registration-field">
                      <label>Email</label>
                      <input
                        type="email"
                        value={registrationData.email}
                        onChange={(e) => handleRegistrationInputChange('email', e.target.value)}
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                    
                    <div className="unified-registration-field">
                      <label>Password</label>
                      <div className="unified-password-input-container">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={registrationData.password}
                          onChange={(e) => handleRegistrationInputChange('password', e.target.value)}
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={togglePasswordVisibility}
                          className="unified-password-toggle"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    
                    {/* Language Selection */}
                    <div className="unified-registration-field">
                      <label>Select your language</label>
                      <select
                        value={language}
                        onChange={(e) => {
                          setLanguage(e.target.value);
                          // TODO: Reactivate if selectedLanguage is needed separately from language
        // setSelectedLanguage(e.target.value);
                        }}
                        className="w-full px-4 py-4 rounded-xl font-mono text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                        style={{ 
                          backgroundColor: '#21262D', 
                          color: '#C9D1D9'
                        }}
                      >
                        <option value="Italiano">Italiano</option>
                        <option value="English">English</option>
                      </select>
                    </div>
                    
                    {/* Stay Connected Checkbox */}
                    <div className="unified-registration-field">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="stayConnected"
                          checked={stayConnected}
                          onChange={(e) => setStayConnected(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 bg-white text-green-600 focus:ring-green-500 focus:ring-2"
                        />
                        <label htmlFor="stayConnected" className="text-sm text-gray-600">
                          {t.stayConnected}
                        </label>
                      </div>
                    </div>
                    
                    <button type="submit" className="unified-registration-submit">
                      {isLogin ? t.signIn : t.startUsingNyra}
                    </button>
                  </form>
                  
                  <div className="unified-registration-footer">
                    <span>
                      {isLogin ? t.dontHaveAccount : t.alreadyHaveAccount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsLogin(!isLogin)}
                      className="unified-registration-toggle"
                    >
                      {isLogin ? t.signUp : t.logIn}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Fallback content quando welcome screen è nascosta
        !isAppReady ? (
          <div className="app">
            <div className="main-content">
              <div className="welcome-fallback">
                <h1>Welcome to NYRA</h1>
                <p>Loading your workspace...</p>
              </div>
            </div>
          </div>
        ) : null
      )}
      
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="logo-section">
            <div className="logo">
              <span className="logo-text">Nyra</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="sidebar-toggle"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
          
          {sidebarOpen && (
            <button onClick={handleNewChat} className="new-chat-btn">
              <Plus size={16} />
              <span>{t.newChat}</span>
            </button>
          )}
        </div>

        {/* Chat List */}
        {sidebarOpen && (
          <div className="chat-list">
            <div className="section-title">{t.recentConversations}</div>
            {chats.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare size={32} className="mx-auto mb-4 opacity-50" style={{ color: 'var(--text-secondary)' }} />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No conversations yet</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Start a chat to see it here</p>
              </div>
            ) : (
              (() => {
                // GENERA CHIAVI UNICHE PER TUTTE LE CHAT
                const uniqueKeys = ensureUniqueRenderKeys();
                
                return chats.map((chat, index) => {
                  // Genera titolo unico basato sull'indice per garantire distintività
                  const chatLabel = `Chat #${index + 1}`;
                  
                  // Usa la chiave unica generata dalla funzione
                  const finalKey = uniqueKeys[index] || `chat_${index}_fallback`;
                  
                  return (
                    <div 
                      key={finalKey} 
                      className={`chat-item ${chat.isActive ? 'active' : ''}`}
                      onClick={() => handleConversationClick(chat.id)}
                    >
                      <div className="chat-info">
                        <div className="chat-name">{chatLabel}</div>
                        <div className="chat-preview">{chat.lastMessage}</div>
                      </div>
                      <div className="chat-time">{formatTime(chat.timestamp)}</div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        )}

        {/* User Profile */}
        <div className="sidebar-footer">
          {sidebarOpen ? (
            <div className="user-profile" style={{ position: 'relative' }}>
              <div className="user-avatar">
                {currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'M'}
              </div>
              <div className="user-info">
                <div className="user-name">{getCurrentUserName()}</div>
                <div className="user-status">{t.online}</div>
              </div>
              <button 
                className="profile-menu"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <MoreHorizontal size={16} />
              </button>
              
              {/* User Menu Dropdown */}
              {showUserMenu && (
                <div className="user-menu-dropdown">
                  <button 
                    onClick={() => {
                      setShowSettings(true);
                      setShowUserMenu(false);
                    }}
                    className="user-menu-item"
                  >
                    <SettingsIcon size={14} />
                    <span>Settings</span>
                  </button>
                  <button 
                    onClick={() => {
                      handleLogout();
                      setShowUserMenu(false);
                    }}
                    className="user-menu-item"
                  >
                    <User size={14} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="user-avatar-mini">
              {currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'M'}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {showSettings ? (
          /* Settings Overlay */
          <div className="settings-overlay">
            <div className="settings-header">
              <button 
                onClick={() => setShowSettings(false)}
                className="settings-back-btn"
              >
                <X size={20} />
              </button>
              <h1 className="settings-title">Settings</h1>
            </div>
            <div className="settings-content">
              {/* Settings content will go here */}
            </div>
          </div>
        ) : (
          <>
            {/* Top Bar */}
            <div className="top-bar">
              <div className="status-indicators">
                <button 
                  onClick={() => setIsOfflineMode(!isOfflineMode)}
                  className={`offline-toggle ${isOfflineMode ? 'active' : ''}`}
                  title={isOfflineMode ? 'Modalità offline attiva' : 'Modalità online'}
                >
                  {isOfflineMode ? <PowerOff size={16} /> : <Power size={16} />}
                  <span>{isOfflineMode ? t.offline : t.online}</span>
                </button>
              </div>

              <div className="top-actions">
                <button 
                  onClick={() => setShowActionHistory(!showActionHistory)}
                  className="action-btn"
                  title="Action History"
                >
                  <Clock size={16} />
                </button>
                
                <div className="theme-switcher">
                  <button 
                    onClick={toggleDarkMode}
                    className="theme-btn"
                  >
                    {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                  </button>
                </div>
              </div>
            </div>



            {/* DA RIMUOVERE: messaggio di benvenuto fisso preimpostato */}
            {/* Welcome Message */}
            {/* {showWelcomeMessage && (
              <div className="welcome-section">
                <h1 className="welcome-title">
                  {t.welcomeMessage.replace('{name}', getCurrentUserName())}
                </h1>
              </div>
            )} */}

            {/* Welcome Message - RIMOSSA COMPLETAMENTE */}

            {/* Chat Messages */}
            {messages.length > 0 && (
              <div className="messages-container">
                <div className="messages">
                  {messages.map((message, index) => (
                    <div key={message.id} className={`message ${message.isUser ? 'user' : 'ai'}`}>
                      {message.isUser ? (
                        <div className="message-content">
                          <span>{message.text}</span>
                        </div>
                      ) : message.type === 'excel-analysis' ? (
                        <div style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.03)',
                          borderRadius: '12px',
                          padding: '16px',
                          border: '1px solid rgba(0, 0, 0, 0.08)',
                          margin: '4px -20px',
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                          wordWrap: 'break-word',
                          width: 'calc(100% + 40px)',
                          transition: 'all 0.3s ease-in-out'
                        }}>
                          <div style={{
                            color: 'rgba(0, 0, 0, 0.85)',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            whiteSpace: 'pre-wrap',
                            fontWeight: '400'
                          }}>
                            {message.text}
                          </div>
                        </div>
                      ) : (
                        <TypewriterMessage 
                          text={message.text}
                          speed={20}
                          isComplete={index < messages.length - 1}
                        />
                      )}
                    </div>
                  ))}
                  
                  {/* Email Preview Component */}
                  {showEmailPreview && emailPreviewData && (
                    <div className="email-preview-wrapper">
                      <EmailPreview
                        emailData={emailPreviewData.categorizedEmails}
                        onSend={handleSendEmails}
                        onCancel={() => {
                          setShowEmailPreview(false);
                          setEmailPreviewData(null);
                          setIsProcessingEmails(false);
                          setUploadedFiles([]);
                          showInfo('Analisi email annullata');
                          
                          // Reset completo dello stato per tornare alla conversazione normale
                          const resetMessage: Message = {
                            id: getUniqueMessageId(),
                            text: 'Email preview annullata. Sono pronta per nuove richieste!',
                            isUser: false,
                            timestamp: new Date(),
                            type: 'normal'
                          };
                          setMessages(prev => [...prev, resetMessage]);
                        }}
                      />
                    </div>
                  )}

                  {/* Excel Analysis Component rimosso - ora è dentro la chat */}

                  {/* Processing Indicator */}
                  {isProcessingEmails && (
                    <div className="processing-indicator">
                      <div className="spinner"></div>
                      <span>Sto analizzando il file Excel...</span>
                    </div>
                  )}
                  
                  {/* Thinking indicator */}
                  {isThinking && (
                    <div className="message ai">
                      <div className="message-content">
                        <span>Nyra is thinking...</span>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}

            {/* Dynamic Greeting for Empty Chats - RIMOSSO */}

            {/* Messaggio di benvenuto in stile NYRA */}
            {messages.length === 0 && appClock && (
              <div className="messages-container">
                <div className="messages">
                  <div className="message ai nyra-welcome">
                    <div className="nyra-welcome-content">
                      <span className="nyra-welcome-text">
                        {getDynamicGreeting(appClock.now ? new Date(appClock.now) : new Date(), appClock.tz)}
                      </span>
                    </div>
                  </div>
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}

            {/* System Status Message */}
            {!isChatInitialized && (
              <div className="messages-container">
                <div className="messages">
                  <div className="message ai">
                    <div className="message-content">
                      <span>Inizializzazione sistema in corso...</span>
                    </div>
                  </div>
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="input-section">
              <div className="input-container">
                <button className="input-action-btn">
                  <Plus size={18} />
                </button>
                
                {/* File Upload Display */}
                {uploadedFiles.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        backgroundColor: 'rgba(139, 168, 201, 0.1)',  // Colore blu NYRA trasparente
                        border: '1px solid rgba(139, 168, 201, 0.3)',
                        borderRadius: '20px',  // Rounded come i bottoni di NYRA
                        marginBottom: '8px'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8BA8C9" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="8" y1="13" x2="16" y2="13"/>
                          <line x1="8" y1="17" x2="16" y2="17"/>
                        </svg>
                        <span style={{ 
                          fontSize: '13px',
                          color: '#6B7280',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {file.name}
                        </span>
                        <button 
                          onClick={() => removeFile(index)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            color: '#9CA3AF'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  disabled={!isChatInitialized || !activeConversationId}
                  placeholder={!isChatInitialized ? "Inizializzazione in corso..." : "Invia un messaggio a Nyra"}
                  onChange={(e) => {
                    setInputMessage(e.target.value);
                  }}
                  onKeyPress={handleKeyPress}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`message-input ${isDragOver ? 'drag-over' : ''}`}
                  rows={1}
                  style={{ resize: 'none' }}
                />
                
                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`mic-btn ${isRecording ? 'listening' : ''}`}
                  title={isRecording ? 'Stop registrazione' : 'Inizia registrazione'}
                >
                  <Mic size={18} />
                </button>
                
                <button 
                  onClick={handleSendMessage}
                  disabled={!isChatInitialized || !activeConversationId}
                  className="send-btn"
                >
                  <Send size={18} />
                </button>
              </div>

              {/* File Upload Area - COMMENTATO: i file appaiono solo nella textarea */}
              {/* {uploadedFiles.length > 0 && (
                <div className="uploaded-files-area">
                  <div className="uploaded-files-header">
                    <span>📎 File Excel caricati:</span>
                  </div>
                  <div className="uploaded-files-list">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="uploaded-file-item">
                        <span className="file-name">📄 {file.name}</span>
                        <span className="file-size">({(file.size/1024).toFixed(1)}KB)</span>
                        <button 
                          onClick={() => removeFile(index)}
                          className="remove-file-btn"
                          title="Rimuovi file"
                        >
                          ❌
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )} */}

              {/* Quick Actions */}
              <div className="quick-actions">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button 
                      key={index} 
                      className="quick-action-btn"
                      onClick={() => handleActionClick(action.text)}
                    >
                      <Icon size={16} />
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Task Memory Panel */}
        {showActionHistory && (
          <div className="overlay-panel action-history">
            <div className="panel-header">
              <h3>Action History</h3>
              <button onClick={() => setShowActionHistory(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="panel-content">
              {actions.length === 0 ? (
                <div className="text-center py-8">
                  <Clock size={32} className="mx-auto mb-4 opacity-50" />
                  <p className="text-gray-500">No actions yet</p>
                </div>
              ) : (
                actions.map(action => (
                  <div key={action.id} className="action-item">
                    <div className="action-info">
                      <div className="action-description">{action.description}</div>
                      <div className="action-conversation">
                        Conversation: {action.conversationTitle}
                      </div>
                      <div className="action-time">
                        {formatDate(action.timestamp)} at {formatTime(action.timestamp)}
                      </div>
                    </div>
                    <div className="action-status completed">
                      ✓
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showTaskMemory && currentUser && (
          <div className="settings-panel">
            <div className="settings-header">
              <button onClick={() => setShowTaskMemory(false)}>
                <X size={16} />
              </button>
              <h3>Settings</h3>
            </div>
            <div className="settings-content">
              <p>Settings panel placeholder</p>
            </div>
          </div>
        )}

        {/* Task Memory Panel - keeping original for now */}
        {showTaskMemory && false && (
          <div className="overlay-panel task-memory">
            <div className="panel-header">
              <h3>Cronologia Azioni</h3>
              <button onClick={() => setShowTaskMemory(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="panel-content">
              {taskMemory.map((task: Task) => (
                <div key={task.id} className="task-item">
                  <div className="task-info">
                    <div className="task-action">{task.action}</div>
                    <div className="task-time">
                      {formatDate(task.timestamp)} alle {formatTime(task.timestamp)}
                    </div>
                  </div>
                  <div className={`task-status ${task.status}`}>
                    {task.status === 'completed' ? '✓' : '✗'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          onSubscriptionManagement={() => {
            console.log('Subscription management clicked');
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

export default App;
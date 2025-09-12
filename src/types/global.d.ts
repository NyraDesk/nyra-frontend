// Dichiarazione globale per ElectronAPI e IntentProcessor
import { OpenRouterConnector } from '../services/openrouter';

declare global {
  interface Window {
    electronAPI?: {
      ping?: () => Promise<string>;
      getAppVersion?: () => Promise<string>;
      storeGet?: (key: string) => Promise<unknown>;
      storeSet?: (key: string, value: unknown) => Promise<void>;
      sendMessage?: (msg: string) => void;
      // Browser automation functions removed
      getPlatform?: () => string;
      log?: (message: string) => Promise<unknown>;
      testIPC?: () => Promise<unknown>;
      openExternal?: (url: string) => Promise<unknown>;
      executeAction?: (actionData: unknown) => Promise<unknown>;
      scrapeFactInfo?: (factData: unknown) => Promise<unknown>;
      createReminder?: (payload: unknown) => Promise<unknown>;
      n8nCreateReminder?: (payload: unknown, url?: string) => Promise<unknown>;
      getBootTime?: () => Promise<string>;
      getSystemTime?: () => Promise<{now: string, timezone: string}>;
    };
    ElectronAPI?: {
      apriAmazon?: (query: string) => Promise<unknown>;
    };
    openRouter?: OpenRouterConnector;
  }
}

export {}; 
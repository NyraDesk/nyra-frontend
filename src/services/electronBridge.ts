// Type definitions per ElectronAPI
interface ElectronAPI {
  ping: () => Promise<string>;
  getAppVersion: () => Promise<string>;
  getPlatform: () => string;
  startAutomation: (type: string, data: any) => Promise<any>;
  closeBrowser: () => Promise<{ success: boolean }>;
  resetAutomation: () => Promise<{ success: boolean }>;
  onAutomationStatus: (callback: (data: any) => void) => void;
  removeAutomationStatusListener: (callback: (data: any) => void) => void;
  log: (message: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export class ElectronBridge {
  
  isElectron(): boolean {
    return typeof window !== 'undefined' && !!window.electronAPI;
  }

  async testConnection(): Promise<boolean> {
    if (!this.isElectron()) {
      console.warn('⚠️ Non in ambiente Electron');
      return false;
    }

    try {
      const response = await window.electronAPI.ping();
      console.log('🔗 Test IPC:', response);
      return response === 'pong';
    } catch (error) {
      console.error('❌ Errore test IPC:', error);
      return false;
    }
  }

  async getAppInfo(): Promise<{version: string, platform: string}> {
    if (!this.isElectron()) {
      return { version: 'web', platform: 'browser' };
    }

    try {
      const version = await window.electronAPI.getAppVersion();
      const platform = window.electronAPI.getPlatform();
      
      console.log('📱 App info:', { version, platform });
      return { version, platform };
    } catch (error) {
      console.error('❌ Errore app info:', error);
      return { version: 'unknown', platform: 'unknown' };
    }
  }

  // Universal Automation MINIMAL
  async startUniversalAutomation(action: string, query: string, site: string): Promise<any> {
    if (!this.isElectron()) {
      throw new Error('Automazione disponibile solo in desktop app');
    }

    try {
      console.log(`🎬 Starting universal automation: ${action} "${query}" on ${site}`);
      
      const result = await window.electronAPI.startAutomation('universal-automation', {
        action,
        query,
        site
      });
      
      console.log(`✅ Universal automation completed:`, result);
      return result;
      
    } catch (error) {
      console.error(`❌ Universal automation failed:`, error);
      throw error;
    }
  }

  // Funzioni mancanti per automazione universale
  async universalSearchOnSite(website: string, query: string): Promise<any> {
    if (!this.isElectron()) {
      throw new Error('Automazione disponibile solo in desktop app');
    }

    try {
      console.log(`🔍 Universal search: "${query}" on ${website}`);
      
      const result = await window.electronAPI.startAutomation('universal-automation', {
        action: 'search_on_site',
        query: query,
        site: website
      });
      
      console.log(`✅ Universal search completed:`, result);
      return result;
      
    } catch (error) {
      console.error(`❌ Universal search failed:`, error);
      return { success: false, error: error.message };
    }
  }

  async universalNavigation(website: string, intent: string): Promise<any> {
    if (!this.isElectron()) {
      throw new Error('Automazione disponibile solo in desktop app');
    }

    try {
      console.log(`🌐 Universal navigation: ${intent} on ${website}`);
      
      const result = await window.electronAPI.startAutomation('universal-automation', {
        action: 'smart_navigation',
        query: intent,
        site: website
      });
      
      console.log(`✅ Universal navigation completed:`, result);
      return result;
      
    } catch (error) {
      console.error(`❌ Universal navigation failed:`, error);
      return { success: false, error: error.message };
    }
  }

  async universalNavigateAndAction(website: string, action: string, query: string): Promise<any> {
    if (!this.isElectron()) {
      throw new Error('Automazione disponibile solo in desktop app');
    }

    try {
      console.log(`🎯 Universal navigate and action: ${action} "${query}" on ${website}`);
      
      const result = await window.electronAPI.startAutomation('universal-automation', {
        action: 'navigate_and_action',
        query: query,
        site: website
      });
      
      console.log(`✅ Universal navigate and action completed:`, result);
      return result;
      
    } catch (error) {
      console.error(`❌ Universal navigate and action failed:`, error);
      return { success: false, error: error.message };
    }
  }

  async smartNavigation(website: string, intent?: string, originalMessage?: string): Promise<any> {
    if (!this.isElectron()) {
      throw new Error('Automazione disponibile solo in desktop app');
    }

    try {
      console.log(`🧠 Smart navigation to: ${website} with intent: ${intent || 'navigate'}`);
      
      // Normalizza URL se necessario
      let normalizedUrl = website;
      if (!website.startsWith('http')) {
        normalizedUrl = website.includes('.') ? `https://${website}` : `https://${website}.com`;
      }
      
      const result = await window.electronAPI.startAutomation('universal-automation', {
        action: 'smart_navigation',
        query: intent || originalMessage || 'navigate',
        site: normalizedUrl
      });
      
      console.log(`✅ Smart navigation completed:`, result);
      return result;
      
    } catch (error) {
      console.error(`❌ Smart navigation failed:`, error);
      return {
        success: false,
        message: `Errore navigazione: ${error.message}`,
        data: null
      };
    }
  }

  async universalNavigate(website: string): Promise<any> {
    return this.smartNavigation(website, 'navigate');
  }

  async universalCheckInfo(website: string, info: string): Promise<any> {
    if (!this.isElectron()) {
      throw new Error('Automazione disponibile solo in desktop app');
    }

    try {
      console.log(`🔍 Universal check info: "${info}" on ${website}`);
      
      const result = await window.electronAPI.startAutomation('universal-automation', {
        action: 'check_info',
        query: info,
        site: website
      });
      
      console.log(`✅ Universal check info completed:`, result);
      return result;
      
    } catch (error) {
      console.error(`❌ Universal check info failed:`, error);
      return { success: false, error: error.message };
    }
  }

  async searchGoogle(query: string): Promise<any> {
    return this.universalSearchOnSite('google.com', query);
  }

  // Browser management
  async closeBrowser(): Promise<{ success: boolean }> {
    if (!this.isElectron()) {
      return { success: false };
    }

    try {
      const result = await window.electronAPI.closeBrowser();
      console.log('🔒 Browser closed:', result);
      return result;
    } catch (error) {
      console.error('❌ Error closing browser:', error);
      return { success: false };
    }
  }

  async resetAutomation(): Promise<{ success: boolean }> {
    if (!this.isElectron()) {
      return { success: false };
    }

    try {
      const result = await window.electronAPI.resetAutomation();
      console.log('🔄 Automation reset:', result);
      return result;
    } catch (error) {
      console.error('❌ Error resetting automation:', error);
      return { success: false };
    }
  }

  // Status updates
  onStatusUpdate(callback: (status: any) => void): void {
    if (!this.isElectron()) return;

    window.electronAPI.onAutomationStatus(callback);
  }

  async logToMain(message: string): Promise<void> {
    if (!this.isElectron()) return;

    try {
      await window.electronAPI.log(`[Renderer] ${message}`);
    } catch (error) {
      console.error('❌ Errore log to main:', error);
    }
  }
}

export const electronBridge = new ElectronBridge(); 
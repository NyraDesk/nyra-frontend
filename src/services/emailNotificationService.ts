import { emailReadService, EmailReadAction } from './emailReadService';

export interface NotificationSettings {
  enabled: boolean;
  frequency: number; // minuti
  checkUnreadOnly: boolean;
  importantOnly: boolean;
  workHoursOnly: boolean;
  soundEnabled: boolean;
  lastCheckTime?: Date;
  lastEmailCount?: number;
}

export interface EmailNotificationAction {
  action: 'email-notifications';
  operation: 'enable' | 'disable' | 'configure';
  frequency?: number;
  checkUnreadOnly?: boolean;
  importantOnly?: boolean;
  workHoursOnly?: boolean;
  soundEnabled?: boolean;
}

export class EmailNotificationService {
  private settings: NotificationSettings;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    // Carica impostazioni salvate o usa default
    this.settings = this.loadSettings();
  }

  private loadSettings(): NotificationSettings {
    const saved = localStorage.getItem('nyra_email_notifications');
    if (saved) {
      return { ...this.getDefaultSettings(), ...JSON.parse(saved) };
    }
    return this.getDefaultSettings();
  }

  private getDefaultSettings(): NotificationSettings {
    return {
      enabled: false,
      frequency: 5,
      checkUnreadOnly: true,
      importantOnly: false,
      workHoursOnly: false,
      soundEnabled: true,
      lastCheckTime: new Date(),
      lastEmailCount: 0
    };
  }

  private saveSettings() {
    localStorage.setItem('nyra_email_notifications', JSON.stringify(this.settings));
  }

  async configureNotifications(action: EmailNotificationAction): Promise<{ success: boolean; message: string }> {
    try {
      switch (action.operation) {
        case 'enable':
          this.settings.enabled = true;
          await this.startNotifications();
          return { success: true, message: 'Notifiche email attivate' };

        case 'disable':
          this.settings.enabled = false;
          this.stopNotifications();
          return { success: true, message: 'Notifiche email disattivate' };

        case 'configure':
          if (action.frequency !== undefined) this.settings.frequency = action.frequency;
          if (action.checkUnreadOnly !== undefined) this.settings.checkUnreadOnly = action.checkUnreadOnly;
          if (action.importantOnly !== undefined) this.settings.importantOnly = action.importantOnly;
          if (action.workHoursOnly !== undefined) this.settings.workHoursOnly = action.workHoursOnly;
          if (action.soundEnabled !== undefined) this.settings.soundEnabled = action.soundEnabled;
          
          this.saveSettings();
          
          if (this.settings.enabled) {
            await this.restartNotifications();
          }
          
          return { success: true, message: 'Impostazioni notifiche aggiornate' };

        default:
          return { success: false, message: 'Operazione non riconosciuta' };
      }
    } catch (error) {
      console.error('Error configuring notifications:', error);
      return { success: false, message: 'Errore nella configurazione' };
    }
  }

  private async startNotifications() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.settings.enabled = true;
    this.saveSettings();
    
    // Controlla subito
    await this.checkNewEmails();
    
    // Imposta intervallo
    this.intervalId = setInterval(async () => {
      await this.checkNewEmails();
    }, this.settings.frequency * 60 * 1000);
    
    console.log(`📧 Email notifications started - checking every ${this.settings.frequency} minutes`);
  }

  private stopNotifications() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this.settings.enabled = false;
    this.saveSettings();
    console.log('📧 Email notifications stopped');
  }

  private async restartNotifications() {
    this.stopNotifications();
    await this.startNotifications();
  }

  private async checkNewEmails() {
    try {
      // Verifica se siamo in orario di lavoro
      if (this.settings.workHoursOnly && !this.isWorkHours()) {
        return;
      }

      // Controlla email non lette
      const emailAction: EmailReadAction = {
        action: 'read-email',
        type: this.settings.checkUnreadOnly ? 'unread' : 'latest',
        count: 10
      };

      const result = await emailReadService.readEmails(emailAction);
      
      if (!result.success || result.emails.length === 0) {
        return;
      }

      // Filtra email importanti se richiesto
      let emailsToNotify = result.emails;
      if (this.settings.importantOnly) {
        emailsToNotify = this.filterImportantEmails(result.emails);
      }

      // Controlla se ci sono nuove email
      const currentCount = emailsToNotify.length;
      const lastCount = this.settings.lastEmailCount || 0;
      
      if (currentCount > lastCount) {
        const newEmails = currentCount - lastCount;
        await this.showNotification(newEmails, emailsToNotify.slice(0, 3));
      }

      // Aggiorna contatori
      this.settings.lastEmailCount = currentCount;
      this.settings.lastCheckTime = new Date();
      this.saveSettings();

    } catch (error) {
      console.error('Error checking new emails:', error);
    }
  }

  private filterImportantEmails(emails: any[]): any[] {
    // Filtra email importanti (mittenti noti, parole chiave, ecc.)
    return emails.filter(email => {
      const from = email.from.toLowerCase();
      const subject = email.subject.toLowerCase();
      
      // Mittenti importanti
      const importantSenders = ['work', 'job', 'boss', 'manager', 'hr', 'admin'];
      const isImportantSender = importantSenders.some(sender => from.includes(sender));
      
      // Parole chiave importanti
      const importantKeywords = ['urgente', 'importante', 'riunione', 'meeting', 'deadline', 'scadenza'];
      const hasImportantKeyword = importantKeywords.some(keyword => 
        subject.includes(keyword) || email.snippet.toLowerCase().includes(keyword)
      );
      
      return isImportantSender || hasImportantKeyword;
    });
  }

  private isWorkHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    // Lunedì-Venerdì, 9-18
    return day >= 1 && day <= 5 && hour >= 9 && hour <= 18;
  }

  private async showNotification(newEmailCount: number, emails: any[]) {
    // Richiedi permesso notifiche se necessario
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    
    if (Notification.permission !== 'granted') {
      return;
    }

    // Crea notifica
    const title = `📧 ${newEmailCount} nuova email${newEmailCount > 1 ? 'i' : ''}`;
    let body = '';
    
    if (emails.length > 0) {
      body = emails.map(email => 
        `• ${email.subject} (da ${email.from})`
      ).join('\n');
      
      if (newEmailCount > 3) {
        body += `\n... e altre ${newEmailCount - 3} email`;
      }
    }

    // Mostra notifica
    const notification = new Notification(title, {
      body: body,
      icon: '/email-icon.png', // Aggiungi icona se disponibile
      tag: 'email-notification',
      requireInteraction: false
    });

    // Suono se abilitato
    if (this.settings.soundEnabled) {
      this.playNotificationSound();
    }

    // Auto-close dopo 5 secondi
    setTimeout(() => {
      notification.close();
    }, 5000);

    // Click handler
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }

  private playNotificationSound() {
    try {
      // Crea audio context per suono
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  getStatus(): { enabled: boolean; isRunning: boolean; lastCheck: Date | undefined } {
    return {
      enabled: this.settings.enabled,
      isRunning: this.isRunning,
      lastCheck: this.settings.lastCheckTime
    };
  }
}

// Singleton instance
export const emailNotificationService = new EmailNotificationService();

import { OpenRouterConnector } from './openrouter';

export interface EmailContext {
  type: 'work' | 'personal' | 'urgent' | 'spam' | 'meeting' | 'project' | 'social';
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  urgency: 'high' | 'medium' | 'low';
  relationship: 'colleague' | 'client' | 'friend' | 'family' | 'unknown';
  actionRequired: boolean;
  suggestedActions: string[];
  keyTopics: string[];
}

export interface EmailTemplate {
  id: string;
  name: string;
  content: string;
  context: string;
  tone: 'formal' | 'friendly' | 'professional' | 'casual';
}

export class EmailTemplateService {
  private openRouter: OpenRouterConnector;

  constructor() {
    this.openRouter = new OpenRouterConnector();
  }

  async analyzeEmailContext(email: {
    subject: string;
    from: string;
    body: string;
    snippet: string;
  }): Promise<EmailContext> {
    try {
      const prompt = `
Analizza questa email e restituisci solo un JSON con il contesto:

EMAIL:
Oggetto: ${email.subject}
Da: ${email.from}
Contenuto: ${email.body || email.snippet}

ANALIZZA:
1. Tipo email (work/personal/urgent/spam/meeting/project/social)
2. Sentiment (positive/neutral/negative/mixed)
3. Urgenza (high/medium/low)
4. Relazione (colleague/client/friend/family/unknown)
5. Azione richiesta (true/false)
6. Azioni suggerite (array di stringhe)
7. Argomenti chiave (array di stringhe)

Restituisci SOLO questo JSON:
{
  "type": "work",
  "sentiment": "positive", 
  "urgency": "medium",
  "relationship": "colleague",
  "actionRequired": true,
  "suggestedActions": ["rispondi", "programma call"],
  "keyTopics": ["YC Co-Founder", "startup"]
}
`;

      const response = await this.openRouter.sendMessage(prompt);
      const context = JSON.parse(response);
      
      return context;
    } catch (error) {
      console.error('Error analyzing email context:', error);
      return this.getDefaultContext();
    }
  }

  async generateTemplates(context: EmailContext, email: {
    subject: string;
    from: string;
    body: string;
  }): Promise<EmailTemplate[]> {
    try {
      const prompt = `
Genera 3 template di risposta email basati su questo contesto:

CONTESTO:
- Tipo: ${context.type}
- Sentiment: ${context.sentiment}
- Urgenza: ${context.urgency}
- Relazione: ${context.relationship}
- Azioni suggerite: ${context.suggestedActions.join(', ')}

EMAIL ORIGINALE:
Oggetto: ${email.subject}
Da: ${email.from}
Contenuto: ${email.body}

GENERA 3 TEMPLATE:
1. Risposta rapida (breve e diretta)
2. Risposta dettagliata (professionale)
3. Risposta follow-up (per azioni future)

Restituisci SOLO questo JSON:
{
  "templates": [
    {
      "id": "quick",
      "name": "Risposta Rapida",
      "content": "Ciao [nome],\n\n[contenuto personalizzato]\n\nCordiali saluti",
      "context": "Per risposte immediate",
      "tone": "friendly"
    }
  ]
}
`;

      const response = await this.openRouter.sendMessage(prompt);
      const result = JSON.parse(response);
      
      return result.templates || [];
    } catch (error) {
      console.error('Error generating templates:', error);
      return this.getDefaultTemplates(context);
    }
  }

  async personalizeTemplate(template: EmailTemplate, email: {
    subject: string;
    from: string;
    body: string;
  }): Promise<string> {
    try {
      const prompt = `
Personalizza questo template per questa email specifica:

TEMPLATE:
${template.content}

EMAIL:
Oggetto: ${email.subject}
Da: ${email.from}
Contenuto: ${email.body}

Sostituisci i placeholder con contenuto specifico e personalizzato.
Restituisci SOLO il testo della email personalizzata.
`;

      const personalizedContent = await this.openRouter.sendMessage(prompt);
      return personalizedContent;
    } catch (error) {
      console.error('Error personalizing template:', error);
      return template.content;
    }
  }

  private getDefaultContext(): EmailContext {
    return {
      type: 'personal',
      sentiment: 'neutral',
      urgency: 'low',
      relationship: 'unknown',
      actionRequired: false,
      suggestedActions: ['leggi'],
      keyTopics: []
    };
  }

  private getDefaultTemplates(context: EmailContext): EmailTemplate[] {
    const baseTemplates = [
      {
        id: 'quick',
        name: 'Risposta Rapida',
        content: `Ciao,\n\nGrazie per il messaggio.\n\nCordiali saluti`,
        context: 'Per risposte immediate',
        tone: 'friendly' as const
      },
      {
        id: 'professional',
        name: 'Risposta Professionale',
        content: `Gentile [nome],\n\nGrazie per avermi contattato.\n\nCordiali saluti`,
        context: 'Per comunicazioni di lavoro',
        tone: 'formal' as const
      },
      {
        id: 'followup',
        name: 'Follow-up',
        content: `Ciao [nome],\n\nCome promesso, ti scrivo per il follow-up.\n\nA presto`,
        context: 'Per azioni future',
        tone: 'professional' as const
      }
    ];

    return baseTemplates;
  }
}

export const emailTemplateService = new EmailTemplateService();

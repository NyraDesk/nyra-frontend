import React from 'react';

interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

interface EmailCardProps {
  email: Email;
  index: number;
}

export const EmailCard: React.FC<EmailCardProps> = ({ email, index }) => {
  // Formatta la data in modo più leggibile
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Estrae il nome del mittente (prima parte prima di <)
  const getSenderName = (from: string) => {
    const match = from.match(/^(.+?)\s*</);
    return match ? match[1].trim() : from;
  };

  // Estrae l'email del mittente
  const getSenderEmail = (from: string) => {
    const match = from.match(/<(.+?)>/);
    return match ? match[1] : from;
  };

  return (
    <div className="email-card">
      <div className="email-card-header">
        <div className="email-number">
          {index + 1}
        </div>
        <div className="email-subject">
          {email.subject || 'Nessun oggetto'}
        </div>
      </div>
      
      <div className="email-card-meta">
        <div className="email-from">
          <span className="email-sender-name">{getSenderName(email.from)}</span>
          <span className="email-sender-address">{getSenderEmail(email.from)}</span>
        </div>
        <div className="email-date">
          {formatDate(email.date)}
        </div>
      </div>
      
      <div className="email-card-preview">
        {email.snippet || 'Nessuna anteprima disponibile'}
      </div>
    </div>
  );
};

export default EmailCard;

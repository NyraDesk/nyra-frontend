import React, { useState } from 'react';

interface EmailPreviewProps {
  emailData: any[];
  onSend: (selected: number[], modifiedEmails?: any[]) => void;
  onCancel: () => void;
}

export const EmailPreview: React.FC<EmailPreviewProps> = ({ 
  emailData, 
  onSend, 
  onCancel
}) => {
  const [selectedEmails, setSelectedEmails] = useState<number[]>(
    emailData.map((_, i) => i)
  );
  const [currentPreview, setCurrentPreview] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedEmails, setEditedEmails] = useState<any[]>(() => 
    emailData.map(email => ({
      ...email,
      body: email.body || email.suggestedBody || '',
      subject: email.subject || email.suggestedSubject || '',
      email: email.email || email.to || ''
    }))
  );

  const grouped = emailData.reduce((acc, email, index) => {
    const type = email.emailType || 'standard';
    if (!acc[type]) acc[type] = [];
    acc[type].push({ ...email, index });
    return acc;
  }, {} as any);

  const handleEdit = () => {
    console.log('🔍 DEBUG - Entrando in modalità modifica:');
    console.log('📧 emailData[currentPreview]:', emailData[currentPreview]);
    console.log('📝 editedEmails[currentPreview]:', editedEmails[currentPreview]);
    console.log('📄 Body value:', editedEmails[currentPreview]?.body || editedEmails[currentPreview]?.suggestedBody || emailData[currentPreview]?.body || emailData[currentPreview]?.suggestedBody);
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    // Le modifiche sono già salvate in editedEmails
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedEmails(emailData); // Ripristina i dati originali
  };

  const handleFieldChange = (field: string, value: string) => {
    const updatedEmails = [...editedEmails];
    updatedEmails[currentPreview] = {
      ...updatedEmails[currentPreview],
      [field]: value
    };
    setEditedEmails(updatedEmails);
  };

  return (
    <div className="email-preview-container">
      <div className="email-summary">
        <h3>📧 Email pronte: {emailData.length} destinatari</h3>
        <div className="email-groups">
          {Object.entries(grouped).map(([type, emails]) => (
            <div key={type} className="email-group">
              {type === 'fattura' && `💰 ${(emails as any[]).length} Fatture`}
              {type === 'sollecito' && `⚠️ ${(emails as any[]).length} Solleciti`}
              {type === 'update' && `📝 ${(emails as any[]).length} Update`}
              {type === 'feedback' && `✅ ${(emails as any[]).length} Feedback`}
              {type === 'standard' && `📧 ${(emails as any[]).length} Standard`}
            </div>
          ))}
        </div>
      </div>

      <div className="email-preview-detail">
        <div className="preview-navigation">
          <button onClick={() => setCurrentPreview(Math.max(0, currentPreview - 1))}>
            ← Prec
          </button>
          <span>{currentPreview + 1} / {emailData.length}</span>
          <button onClick={() => setCurrentPreview(Math.min(emailData.length - 1, currentPreview + 1))}>
            Succ →
          </button>
        </div>

        <div className="email-content-preview">
          <div className="email-header">
            <strong>A:</strong> 
            {isEditing ? (
              <input 
                type="email" 
                value={editedEmails[currentPreview]?.email || ''} 
                onChange={(e) => handleFieldChange('email', e.target.value)}
                style={{ marginLeft: '8px', padding: '4px', border: '1px solid rgba(203, 213, 225, 0.3)', borderRadius: '4px', backgroundColor: 'white', color: '#475569' }}
              />
            ) : (
              ` ${editedEmails[currentPreview]?.email}`
            )}
            <br/>
            <strong>Oggetto:</strong> 
            {isEditing ? (
              <input 
                type="text" 
                value={editedEmails[currentPreview]?.subject || editedEmails[currentPreview]?.suggestedSubject || ''} 
                onChange={(e) => handleFieldChange('subject', e.target.value)}
                style={{ marginLeft: '8px', padding: '4px', border: '1px solid rgba(203, 213, 225, 0.3)', borderRadius: '4px', width: '300px', backgroundColor: 'white', color: '#475569' }}
              />
            ) : (
              ` ${editedEmails[currentPreview]?.subject || editedEmails[currentPreview]?.suggestedSubject}`
            )}
          </div>
          <div className="email-body">
            {isEditing ? (
              <textarea 
                value={editedEmails[currentPreview]?.body || editedEmails[currentPreview]?.suggestedBody || emailData[currentPreview]?.body || emailData[currentPreview]?.suggestedBody || ''} 
                onChange={(e) => handleFieldChange('body', e.target.value)}
                style={{ width: '100%', minHeight: '200px', padding: '8px', border: '1px solid rgba(203, 213, 225, 0.3)', borderRadius: '4px', fontFamily: 'inherit', color: '#475569', backgroundColor: 'white' }}
                placeholder="Inserisci il testo dell'email..."
              />
            ) : (
              editedEmails[currentPreview]?.body || editedEmails[currentPreview]?.suggestedBody || emailData[currentPreview]?.body || emailData[currentPreview]?.suggestedBody
            )}
          </div>
        </div>
      </div>

      <div className="email-actions">
        {!isEditing ? (
          <>
            <button className="btn-cancel" onClick={onCancel}>
              Annulla
            </button>
            <button className="btn-edit" onClick={handleEdit} style={{ 
              backgroundColor: '#7c9cbf', 
              color: 'white', 
              border: 'none', 
              padding: '8px 16px', 
              borderRadius: '12px', 
              marginRight: '8px',
              cursor: 'pointer'
            }}>
              Modifica
            </button>
            <button className="btn-send-all" onClick={() => onSend(editedEmails.map((_, i) => i), editedEmails)}>
              Invia Tutte ({selectedEmails.length})
            </button>
          </>
        ) : (
          <>
            <button className="btn-cancel" onClick={handleCancelEdit}>
              Annulla Modifiche
            </button>
            <button className="btn-save" onClick={handleSave} style={{ 
              backgroundColor: '#7c9cbf', 
              color: 'white', 
              border: 'none', 
              padding: '8px 16px', 
              borderRadius: '4px', 
              marginRight: '8px',
              cursor: 'pointer'
            }}>
              💾 Salva
            </button>
            <button className="btn-send-all" onClick={() => onSend(editedEmails.map((_, i) => i), editedEmails)}>
              Invia Tutte ({selectedEmails.length})
            </button>
          </>
        )}
      </div>
    </div>
  );
};

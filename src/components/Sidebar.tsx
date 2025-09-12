import React, { useState } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage?: (message: string) => void; // Aggiungi callback per inviare messaggi al sistema principale
}

export default function Sidebar({ isOpen, onClose, onSendMessage }: SidebarProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Sistema NYRA inizializzato. Come posso aiutarti con l\'automazione browser?',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Se c'è un callback, invia il messaggio al sistema principale
    if (onSendMessage) {
      onSendMessage(inputMessage);
    } else {
      // Fallback: Mostra messaggio di conferma
      setTimeout(() => {
        const nyraResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: `Ho ricevuto il comando: "${inputMessage}". Sto analizzando e preparando l'automazione...`,
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, nyraResponse]);
      }, 1000);
    }
    
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 bg-gray-900/50 backdrop-blur-xl border-l border-gray-700/50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-white">Command Interface</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-700/50 transition-colors duration-200"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${
              message.isUser 
                ? 'bg-cyan-500/20 text-cyan-100' 
                : 'bg-gray-800/50 text-gray-100'
            }`}>
              <p className="text-sm">{message.text}</p>
              <span className="text-xs opacity-60 mt-1 block">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter command..."
            className="flex-1 bg-gray-800/50 border border-gray-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim()}
            className="px-3 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
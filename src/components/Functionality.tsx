import React from 'react';
import { ArrowLeft, Calendar, Clock, Mail, Edit3, Search, ExternalLink, Folder, FileText, MessageCircle, Sparkles } from 'lucide-react';

interface FunctionalityProps {
  onBack: () => void;
}

export default function Functionality({ onBack }: FunctionalityProps) {
  const categories = [
    {
      title: 'CALENDARIO',
      icon: Calendar,
      items: [
        { icon: Calendar, text: 'Crea eventi sul calendario locale' },
        { icon: Clock, text: 'Imposta promemoria offline' }
      ]
    },
    {
      title: 'EMAIL',
      icon: Mail,
      items: [
        { icon: Mail, text: 'Invia email tramite client di default' },
        { icon: Edit3, text: 'Scrivi email con assistenza AI' }
      ]
    },
    {
      title: 'RICERCA E WEB',
      icon: Search,
      items: [
        { icon: Search, text: 'Ricerca online' },
        { icon: ExternalLink, text: 'Apri link o applicazioni' }
      ]
    },
    {
      title: 'FILE E SISTEMA',
      icon: Folder,
      items: [
        { icon: Folder, text: 'Apri cartelle (Download, Documenti)' },
        { icon: FileText, text: 'Crea e gestisci file locali' }
      ]
    },
    {
      title: 'AI ASSISTENTE',
      icon: MessageCircle,
      items: [
        { icon: MessageCircle, text: 'Chat di supporto creativo e tecnico' },
        { icon: Sparkles, text: 'Genera testi, idee, strategie' }
      ]
    }
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center gap-4" style={{ borderColor: '#30363D' }}>
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors duration-200"
        >
          <ArrowLeft size={20} style={{ color: '#C9D1D9' }} />
        </button>
        <h1 className="text-xl font-mono font-bold" style={{ color: '#C9D1D9' }}>
          Funzionalità
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-mono font-bold mb-4" style={{ color: '#C9D1D9' }}>
              Cosa posso fare per te
            </h1>
            <p className="font-mono text-base font-medium leading-relaxed max-w-2xl mx-auto" style={{ color: '#8B949E' }}>
              DO‑AI ti aiuta a risparmiare tempo. Ecco alcune azioni che puoi chiedermi di eseguire:
            </p>
          </div>

          {/* Categories Grid */}
          <div className="space-y-8">
            {categories.map((category, categoryIndex) => {
              const CategoryIcon = category.icon;
              
              return (
                <div key={categoryIndex} className="space-y-4">
                  {/* Category Header */}
                  <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: '#30363D' }}>
                    <div className="w-6 h-6 flex items-center justify-center">
                      <CategoryIcon size={18} style={{ color: '#00FF7A' }} />
                    </div>
                    <h2 className="font-mono text-lg font-bold tracking-wider" style={{ color: '#00FF7A' }}>
                      {category.title}
                    </h2>
                  </div>

                  {/* Category Items */}
                  <div className="grid md:grid-cols-2 gap-3 ml-9">
                    {category.items.map((item, itemIndex) => {
                      const ItemIcon = item.icon;
                      
                      return (
                        <div
                          key={itemIndex}
                          className="flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:border-gray-500"
                          style={{ 
                            backgroundColor: '#161B22',
                            borderColor: '#30363D'
                          }}
                        >
                          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                            <ItemIcon size={16} style={{ color: '#8B949E' }} />
                          </div>
                          <span className="font-mono text-sm" style={{ color: '#C9D1D9' }}>
                            {item.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Button */}
          <div className="mt-12 text-center">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-6 py-3 font-mono text-sm font-medium border rounded-lg transition-all duration-200 hover:border-green-500 hover:bg-green-500 hover:bg-opacity-10"
              style={{ 
                color: '#C9D1D9',
                borderColor: '#30363D'
              }}
            >
              <span style={{ color: '#00FF7A' }}>▸</span>
              Torna alla Chat
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
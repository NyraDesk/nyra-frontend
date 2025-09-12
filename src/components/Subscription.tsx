import React, { useState } from 'react';
import { ArrowLeft, Check, Zap, Crown, Building } from 'lucide-react';

interface SubscriptionProps {
  onBack: () => void;
}

export default function Subscription({ onBack }: SubscriptionProps) {
  const [activePlan, setActivePlan] = useState('standard');

  const plans = [
    {
      id: 'standard',
      name: 'Standard',
      price: 'Gratis',
      tokens: '50k',
      icon: Zap,
      features: [
        '50.000 token/mese',
        'Modelli base',
        'Supporto community',
        'Cronologia limitata'
      ],
      color: '#8B949E'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '9,90€',
      tokens: '300k',
      icon: Crown,
      features: [
        '300.000 token/mese',
        'Tutti i modelli AI',
        'Supporto prioritario',
        'Cronologia illimitata',
        'Caricamento file avanzato'
      ],
      color: '#3FB950'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '29,90€',
      tokens: '1M+',
      icon: Building,
      features: [
        '1.000.000+ token/mese',
        'Modelli personalizzati',
        'Supporto dedicato',
        'API access',
        'Team collaboration',
        'Analytics avanzate'
      ],
      color: '#F7931E'
    }
  ];

  const handleActivatePlan = (planId: string) => {
    setActivePlan(planId);
    // Here you would integrate with payment system
  };

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
          Gestione Abbonamento
        </h1>
      </div>

      {/* Subscription Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Current Plan Info */}
          <div className="mb-8 p-6 rounded-xl border" style={{ backgroundColor: '#161B22', borderColor: '#30363D' }}>
            <h2 className="text-lg font-mono font-semibold mb-2" style={{ color: '#C9D1D9' }}>
              Piano Attuale
            </h2>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="font-mono text-sm" style={{ color: '#8B949E' }}>
                {plans.find(p => p.id === activePlan)?.name} - {plans.find(p => p.id === activePlan)?.tokens} token/mese
              </span>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isActive = activePlan === plan.id;
              
              return (
                <div
                  key={plan.id}
                  className={`relative p-6 rounded-2xl border-2 transition-all duration-200 ${
                    isActive 
                      ? 'border-green-500 shadow-lg shadow-green-500/20' 
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  style={{ backgroundColor: '#161B22' }}
                >
                  {/* Active Badge */}
                  {isActive && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <div className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-green-500 text-white">
                        ATTIVO
                      </div>
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center mb-3">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${plan.color}20` }}
                      >
                        <Icon size={24} style={{ color: plan.color }} />
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-mono font-bold mb-2" style={{ color: '#C9D1D9' }}>
                      {plan.name}
                    </h3>
                    
                    <div className="mb-2">
                      <span className="text-3xl font-mono font-bold" style={{ color: plan.color }}>
                        {plan.price}
                      </span>
                      {plan.price !== 'Gratis' && (
                        <span className="font-mono text-sm" style={{ color: '#8B949E' }}>
                          /mese
                        </span>
                      )}
                    </div>
                    
                    <div className="font-mono text-sm" style={{ color: '#8B949E' }}>
                      {plan.tokens} token/mese
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Check size={16} style={{ color: plan.color }} />
                        <span className="font-mono text-sm" style={{ color: '#C9D1D9' }}>
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleActivatePlan(plan.id)}
                    disabled={isActive}
                    className={`w-full py-3 rounded-xl font-mono text-sm font-bold transition-all duration-200 ${
                      isActive
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                    style={{
                      backgroundColor: isActive ? '#30363D' : `${plan.color}20`,
                      color: isActive ? '#8B949E' : plan.color,
                      border: `1px solid ${plan.color}`
                    }}
                  >
                    {isActive ? 'Piano Attivo' : 'Attiva Piano'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Back to Settings */}
          <div className="mt-8 text-center">
            <button
              onClick={onBack}
              className="px-6 py-3 rounded-xl font-mono text-sm font-medium transition-all duration-200 hover:bg-gray-800"
              style={{ color: '#8B949E' }}
            >
              Torna alle impostazioni
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
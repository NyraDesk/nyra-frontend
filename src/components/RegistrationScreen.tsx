import React, { useState } from 'react';
import { Mail, User, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface RegistrationScreenProps {
  onComplete: (userName: string) => void;
}

export default function RegistrationScreen({ onComplete }: RegistrationScreenProps) {
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [stayConnected, setStayConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      if (!email.trim() || !password.trim()) return;
    } else {
      if (!name.trim() || !email.trim() || !password.trim()) return;
    }
    
    setIsLoading(true);
    
    // Simulate registration/login process
    setTimeout(() => {
      setIsLoading(false);
      onComplete(isLogin ? email.split('@')[0] : name.trim());
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 font-mono" style={{ backgroundColor: '#000000' }}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C9D1D9' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Main Card */}
        <div className="rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: '#000000', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
          
          {/* Header */}
          <div className="pt-36 px-8 pb-6 text-center">
            {/* DO-AI Icon */}
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <div className="flex items-center gap-1">
                  <span className="text-white font-mono font-bold text-lg">&gt;</span>
                  <span className="text-white font-mono font-bold text-lg">_</span>
                </div>
              </div>
            </div>
            
            {/* Brand Name */}
            <h1 className="font-mono font-bold text-2xl tracking-wider mb-2" style={{ color: '#C9D1D9' }}>
              DO-AI
            </h1>
            
            {/* Tagline */}
            <p className="font-mono text-sm mb-8" style={{ color: '#8B949E' }}>
              Il tuo assistente personale
            </p>
            
            {/* Title */}
            <h2 className="text-xl font-mono font-bold mb-2" style={{ color: '#C9D1D9' }}>
              {isLogin ? 'Accedi' : 'Crea il tuo account'}
            </h2>
            
            {/* Subtitle */}
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field (only for registration) */}
              {!isLogin && (
                <div className="space-y-2">
                  <label className="block font-mono text-sm font-semibold" style={{ color: '#C9D1D9' }}>
                    Nome
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="text-gray-400" size={18} />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Il tuo nome"
                      className="w-full pl-12 pr-4 py-4 rounded-xl font-mono text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      style={{ 
                        backgroundColor: '#21262D', 
                        color: '#C9D1D9'
                      }}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <label className="block font-mono text-sm font-semibold" style={{ color: '#C9D1D9' }}>
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="text-gray-400" size={18} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-12 pr-4 py-4 rounded-xl font-mono text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    style={{ 
                      backgroundColor: '#21262D', 
                      color: '#C9D1D9'
                    }}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="block font-mono text-sm font-semibold" style={{ color: '#C9D1D9' }}>
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="font-mono font-bold text-gray-400">#</span>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-4 rounded-xl font-mono text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    style={{ 
                      backgroundColor: '#21262D', 
                      color: '#C9D1D9'
                    }}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-300 transition-colors duration-200"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Stay Connected Checkbox */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="stayConnected"
                  checked={stayConnected}
                  onChange={(e) => setStayConnected(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500 focus:ring-2"
                  disabled={isLoading}
                />
                <label htmlFor="stayConnected" className="font-mono text-sm" style={{ color: '#C9D1D9' }}>
                  Resta collegato
                </label>
              </div>

              {/* START Button */}
              <button
                type="submit"
                disabled={isLoading || (isLogin ? (!email.trim() || !password.trim()) : (!name.trim() || !email.trim() || !password.trim()))}
                className="w-full py-4 rounded-xl font-mono text-sm font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-3 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  backgroundColor: 'rgba(107, 114, 126, 0.8)',
                  color: '#FFFFFF'
                }}
              >
                {isLoading ? (
                  <>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span>{isLogin ? 'Accesso...' : 'Inizializzazione...'}</span>
                  </>
                ) : (
                  <>
                    <span>START</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Login/Register */}
            <div className="mt-6 text-center">
              <p className="font-mono text-sm" style={{ color: '#8B949E' }}>
                {isLogin ? "Non hai un account?" : "Hai già un account?"}
              </p>
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="mt-2 font-mono text-sm font-semibold hover:underline transition-colors duration-200"
                style={{ color: '#3FB950' }}
                disabled={isLoading}
              >
                {isLogin ? 'Registrati' : 'Accedi'}
              </button>
            </div>
          </div>

          {/* Terminal Footer */}
          <div className="px-8 py-4 border-t flex items-center justify-between" style={{ borderColor: '#30363D', backgroundColor: '#000000' }}>
            <span className="font-mono text-xs" style={{ color: '#8B949E' }}>{isLogin ? 'Accedi al tuo account' : ''}</span>
          </div>

          {/* Footer Text */}
          <div className="text-center px-8 pb-4">
            <span className="font-mono text-xs" style={{ color: '#C9D1D9', opacity: 0.6, fontSize: '12px' }}>
              DO-AI • powered by AI Art Dept
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
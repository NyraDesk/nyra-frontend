import React, { useState, useEffect } from 'react';
import { tokenManager } from '../services/oauth/tokenManager';

interface OAuthStatusProps {
  userId: string;
  className?: string;
}

interface TokenInfo {
  success: boolean;
  access_token?: string;
  token_type?: string;
  expires_at?: string;
  scope?: string;
  refreshed?: boolean;
  error?: string;
  requires_auth?: boolean;
}

const OAuthStatus: React.FC<OAuthStatusProps> = ({ userId, className = '' }) => {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    checkTokenStatus();
    
    // Auto refresh status every 5 minutes
    const interval = setInterval(checkTokenStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [userId]);

  const checkTokenStatus = async () => {
    try {
      setLoading(true);
      const tokenResponse = await tokenManager.getValidToken(userId);
      setTokenInfo(tokenResponse);
      setLastCheck(new Date());
    } catch (error) {
      console.error('[OAuth] Error checking token status:', error);
      setTokenInfo({
        success: false,
        error: 'Failed to check token status'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (loading) return 'text-gray-500';
    if (!tokenInfo) return 'text-gray-500';
    if (tokenInfo.success) {
      return tokenInfo.refreshed ? 'text-yellow-600' : 'text-green-600';
    }
    return tokenInfo.requires_auth ? 'text-red-600' : 'text-orange-600';
  };

  const getStatusIcon = () => {
    if (loading) return '⏳';
    if (!tokenInfo) return '❓';
    if (tokenInfo.success) {
      return tokenInfo.refreshed ? '🔄' : '✅';
    }
    return tokenInfo.requires_auth ? '❌' : '⚠️';
  };

  const getStatusText = () => {
    if (loading) return 'Checking...';
    if (!tokenInfo) return 'Unknown';
    if (tokenInfo.success) {
      return tokenInfo.refreshed ? 'Active (Refreshed)' : 'Active';
    }
    if (tokenInfo.requires_auth) return 'Authentication Required';
    return 'Error';
  };

  const getTimeUntilExpiry = () => {
    if (!tokenInfo?.expires_at) return null;
    
    const now = new Date();
    const expiresAt = new Date(tokenInfo.expires_at);
    const diff = expiresAt.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className={`oauth-status ${className}`}>
      <div className="flex items-center space-x-2">
        <span className="text-lg">{getStatusIcon()}</span>
        <div className="flex-1">
          <div className={`text-sm font-medium ${getStatusColor()}`}>
            Google OAuth: {getStatusText()}
          </div>
          
          {tokenInfo?.success && tokenInfo.expires_at && (
            <div className="text-xs text-gray-500">
              Expires in {getTimeUntilExpiry()}
            </div>
          )}
          
          {tokenInfo?.error && (
            <div className="text-xs text-red-600">
              {tokenInfo.error}
            </div>
          )}
          
          {lastCheck && (
            <div className="text-xs text-gray-400">
              Last check: {lastCheck.toLocaleTimeString()}
            </div>
          )}
        </div>
        
        <button
          onClick={checkTokenStatus}
          disabled={loading}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400 transition-colors"
          title="Refresh status"
        >
          {loading ? '⏳' : '🔄'}
        </button>
      </div>
      
      {tokenInfo?.success && tokenInfo.scope && (
        <div className="mt-2 text-xs text-gray-600">
          <details>
            <summary className="cursor-pointer hover:text-gray-800">
              Permissions ({tokenInfo.scope.split(' ').length})
            </summary>
            <ul className="mt-1 list-disc list-inside space-y-0.5 text-xs">
              {tokenInfo.scope.split(' ').map((scope, index) => (
                <li key={index} className="truncate">
                  {scope.replace('https://www.googleapis.com/auth/', '').replace('gmail.', 'Gmail: ').replace('calendar', 'Calendar')}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
};

export default OAuthStatus;
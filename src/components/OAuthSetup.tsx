import React, { useState, useEffect } from 'react';
import { tokenManager } from '../services/oauth/tokenManager';

interface OAuthSetupProps {
  userId: string;
  onAuthComplete?: (success: boolean) => void;
}

interface AuthStatus {
  authenticated: boolean;
  expires_at?: string;
  expired?: boolean;
  scope?: string;
  created_at?: string;
  updated_at?: string;
}

const OAuthSetup: React.FC<OAuthSetupProps> = ({ userId, onAuthComplete }) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [oauthUrl, setOauthUrl] = useState<string>('');

  useEffect(() => {
    checkAuthStatus();
    
    // Listen for OAuth callbacks
    const handleOAuthCallback = async (callbackData: any) => {
      console.log('[OAuth] Received callback:', callbackData);
      
      if (callbackData.error) {
        setError(`OAuth error: ${callbackData.error}`);
        setLoading(false);
        return;
      }

      if (callbackData.code && callbackData.state) {
        try {
          setLoading(true);
          const result = await tokenManager.handleOAuthCallback(callbackData.code, callbackData.state);
          
          if (result.success) {
            await checkAuthStatus();
            onAuthComplete?.(true);
          } else {
            setError(result.error || 'Authentication failed');
            onAuthComplete?.(false);
          }
        } catch (error) {
          console.error('[OAuth] Error handling callback:', error);
          setError('Failed to complete authentication');
          onAuthComplete?.(false);
        } finally {
          setLoading(false);
        }
      }
    };

    // Add callback listener
    window.electronAPI.onOAuthCallback(handleOAuthCallback);
    
    return () => {
      // Remove callback listener on cleanup
      window.electronAPI.removeOAuthCallbackListener(handleOAuthCallback);
    };
  }, [userId, onAuthComplete]);

  const checkAuthStatus = async () => {
    try {
      const status = await tokenManager.getAuthStatus(userId);
      setAuthStatus(status);
    } catch (error) {
      console.error('[OAuth] Error checking auth status:', error);
      setError('Failed to check authentication status');
    }
  };

  const startOAuthFlow = async () => {
    try {
      setLoading(true);
      setError('');
      
      const authUrl = await tokenManager.startOAuthFlow(userId);
      setOauthUrl(authUrl);
      
      // Start OAuth flow using system browser
      const result = await window.electronAPI.startOAuthFlow(userId, true);
      
      if (result.success) {
        // OAuth flow started, waiting for callback
        console.log('[OAuth] OAuth flow started, waiting for callback...');
      } else {
        throw new Error('Failed to start OAuth flow');
      }
    } catch (error) {
      console.error('[OAuth] Error starting OAuth flow:', error);
      setError('Failed to start authentication');
      setLoading(false);
    }
  };

  const revokeTokens = async () => {
    try {
      setLoading(true);
      setError('');
      
      const success = await tokenManager.revokeUserTokens(userId);
      
      if (success) {
        await checkAuthStatus();
      } else {
        setError('Failed to revoke tokens');
      }
    } catch (error) {
      console.error('[OAuth] Error revoking tokens:', error);
      setError('Failed to revoke tokens');
    } finally {
      setLoading(false);
    }
  };

  const verifyToken = async () => {
    try {
      setLoading(true);
      setError('');
      
      const verification = await tokenManager.verifyToken(userId);
      
      if (verification.valid) {
        await checkAuthStatus();
      } else {
        setError(verification.error || 'Token verification failed');
      }
    } catch (error) {
      console.error('[OAuth] Error verifying token:', error);
      setError('Failed to verify token');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isTokenExpiringSoon = () => {
    if (!authStatus?.expires_at) return false;
    
    const now = new Date();
    const expiresAt = new Date(authStatus.expires_at);
    const oneHourFromNow = new Date(now.getTime() + (60 * 60 * 1000));
    
    return expiresAt <= oneHourFromNow;
  };

  return (
    <div className="oauth-setup p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Google OAuth Setup</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Authentication Status</h3>
        
        {authStatus ? (
          <div className="space-y-2">
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              authStatus.authenticated 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {authStatus.authenticated ? '✓ Authenticated' : '✗ Not Authenticated'}
            </div>
            
            {authStatus.authenticated && (
              <>
                <div className="text-sm text-gray-600">
                  <strong>Expires:</strong> {formatDate(authStatus.expires_at!)}
                  {isTokenExpiringSoon() && (
                    <span className="ml-2 text-orange-600 font-medium">
                      ⚠ Expires soon
                    </span>
                  )}
                </div>
                
                {authStatus.scope && (
                  <div className="text-sm text-gray-600">
                    <strong>Permissions:</strong>
                    <ul className="mt-1 list-disc list-inside text-xs">
                      {authStatus.scope.split(' ').map((scope, index) => (
                        <li key={index} className="truncate">
                          {scope.replace('https://www.googleapis.com/auth/', '')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="text-sm text-gray-600">
                  <strong>Connected:</strong> {formatDate(authStatus.created_at!)}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-gray-500">Checking status...</div>
        )}
      </div>

      <div className="space-y-3">
        {!authStatus?.authenticated ? (
          <button
            onClick={startOAuthFlow}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </span>
            ) : (
              'Connect Google Account'
            )}
          </button>
        ) : (
          <div className="space-y-3">
            <button
              onClick={verifyToken}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify Connection'}
            </button>
            
            <button
              onClick={revokeTokens}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Disconnecting...' : 'Disconnect Account'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 text-sm text-gray-600">
        <p><strong>Required Permissions:</strong></p>
        <ul className="mt-2 list-disc list-inside space-y-1 text-xs">
          <li>Send emails via Gmail</li>
          <li>Manage calendar events</li>
          <li>View basic profile information</li>
        </ul>
      </div>

      {oauthUrl && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            If the browser didn't open automatically, click{' '}
            <a 
              href={oauthUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              here
            </a>{' '}
            to authorize NYRA.
          </p>
        </div>
      )}
    </div>
  );
};

export default OAuthSetup;
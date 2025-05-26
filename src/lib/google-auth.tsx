import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

interface UserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

interface GoogleAuthContextType {
  isLoggedIn: boolean;
  accessToken: string | null;
  userInfo: UserInfo | null;
  login: () => void;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

export const useGoogleAuth = () => {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error('useGoogleAuth must be used within a GoogleAuthProvider');
  }
  return context;
};

interface GoogleAuthProviderProps {
  children: ReactNode;
  clientId: string;
}

const SCOPES = [
  'https://www.googleapis.com/auth/script.projects',
  'https://www.googleapis.com/auth/script.projects.readonly',
  'https://www.googleapis.com/auth/script.scriptapp',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

function GoogleAuthProviderInner({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for stored token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('googleAccessToken');
    const tokenExpiry = localStorage.getItem('googleTokenExpiry');
    
    if (storedToken && tokenExpiry) {
      const expiryTime = Number.parseInt(tokenExpiry);
      if (Date.now() < expiryTime) {
        setAccessToken(storedToken);
        setIsLoggedIn(true);
        // Fetch user info with stored token
        fetchUserInfo(storedToken);
      } else {
        // Token expired, clear it
        localStorage.removeItem('googleAccessToken');
        localStorage.removeItem('googleTokenExpiry');
      }
    }
  }, []);

  const fetchUserInfo = async (token: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json() as UserInfo;
        setUserInfo(data);
      }
    } catch (err) {
      console.error('Failed to fetch user info:', err);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Store token and expiry
        const expiryTime = Date.now() + (tokenResponse.expires_in * 1000);
        localStorage.setItem('googleAccessToken', tokenResponse.access_token);
        localStorage.setItem('googleTokenExpiry', expiryTime.toString());
        
        setAccessToken(tokenResponse.access_token);
        setIsLoggedIn(true);
        
        // Fetch user info
        await fetchUserInfo(tokenResponse.access_token);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to complete login');
      } finally {
        setIsLoading(false);
      }
    },
    onError: (error) => {
      console.error('Login Failed:', error);
      setError('Login failed. Please try again.');
      setIsLoading(false);
    },
    scope: SCOPES.join(' '),
    flow: 'implicit',
  });

  const login = () => {
    setIsLoading(true);
    setError(null);
    googleLogin();
  };

  const logout = () => {
    // Clear tokens
    localStorage.removeItem('googleAccessToken');
    localStorage.removeItem('googleTokenExpiry');
    
    // Reset state
    setAccessToken(null);
    setUserInfo(null);
    setIsLoggedIn(false);
    setError(null);
    
    // Optionally revoke the token
    if (accessToken) {
      fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
        method: 'POST',
      }).catch(console.error);
    }
  };

  const value: GoogleAuthContextType = {
    isLoggedIn,
    accessToken,
    userInfo,
    login,
    logout,
    isLoading,
    error,
  };

  return (
    <GoogleAuthContext.Provider value={value}>
      {children}
    </GoogleAuthContext.Provider>
  );
}

export function GoogleAuthProvider({ children, clientId }: GoogleAuthProviderProps) {
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleAuthProviderInner>{children}</GoogleAuthProviderInner>
    </GoogleOAuthProvider>
  );
} 
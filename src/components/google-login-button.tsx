import React from 'react';
import { Button } from './ui/button';
import { useGoogleAuth } from '@/lib/google-auth';
import { LogOut, User } from 'lucide-react';

export default function GoogleLoginButton() {
  const { isLoggedIn, userInfo, login, logout, isLoading, error } = useGoogleAuth();

  if (isLoggedIn && userInfo) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-sm">
          {userInfo.picture && (
            <img 
              src={userInfo.picture} 
              alt={userInfo.name} 
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="hidden md:inline text-gray-700">{userInfo.name}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="border-[#FF6B35] text-[#FF6B35] hover:bg-[#FF6B35]/10"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-sm text-red-600">{error}</span>
      )}
      <Button
        onClick={login}
        disabled={isLoading}
        className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Connecting...
          </>
        ) : (
          <>
            <User className="h-4 w-4 mr-2" />
            Login with Google
          </>
        )}
      </Button>
    </div>
  );
} 
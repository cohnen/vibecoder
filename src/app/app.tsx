import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { GoogleAuthProvider } from '@/lib/google-auth';
import Home from './page';
import AppsScriptTestView from '@/components/apps-script-test-view';
import GoogleLoginButton from '@/components/google-login-button';
import { Blocks, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Get Google Client ID from environment variable
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function Navigation() {
  const location = useLocation();
  
  return (
    <header className="border-b border-[#FF6B35]/20 p-3 md:p-4">
      <div className="container max-w-7xl mx-auto px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Blocks className="h-8 w-8 text-[#FF6B35]" />
          <h1 className="text-2xl font-bold text-[#FF6B35]">VibeCoder</h1>
        </Link>
        
        <div className="flex items-center gap-4">
          {location.pathname !== '/test' && (
            <Link to="/test">
              <Button variant="ghost" size="sm" className="text-[#FF6B35] hover:bg-[#FF6B35]/10">
                <TestTube className="h-4 w-4 mr-2" />
                Test Permissions
              </Button>
            </Link>
          )}
          
          {location.pathname === '/test' && (
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-[#FF6B35] hover:bg-[#FF6B35]/10">
                Back to Home
              </Button>
            </Link>
          )}
          
          <GoogleLoginButton />
        </div>
      </div>
    </header>
  );
}

export default function App() {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="min-h-screen bg-[#FFFAF5] flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
          <p className="text-gray-700">
            Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <GoogleAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <div className="min-h-screen bg-[#FFFAF5] flex flex-col">
          <Navigation />
          
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/test" element={
                <div className="container max-w-7xl mx-auto px-4 py-6 md:py-12">
                  <AppsScriptTestView />
                </div>
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </GoogleAuthProvider>
  );
} 
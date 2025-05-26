import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, RefreshCw, Calendar, User } from 'lucide-react';
import { callGoogleDriveAPI } from '@/lib/google-api-proxy';

interface AppScript {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink: string;
  owners: Array<{ displayName: string; emailAddress: string }>;
}

interface AppsScriptManagerProps {
  googleAccessToken: string | null;
  isGoogleLoggedIn: boolean;
  onError: (error: string) => void;
}

export default function AppsScriptManager({ 
  googleAccessToken, 
  isGoogleLoggedIn, 
  onError 
}: AppsScriptManagerProps) {
  const [scripts, setScripts] = useState<AppScript[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadScripts = useCallback(async () => {
    if (!googleAccessToken) {
      setError('No access token available. Please log in with Google.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Query Google Drive for Apps Script files
      const response = await callGoogleDriveAPI(
        `files?q=mimeType='application/vnd.google-apps.script'&fields=files(id,name,createdTime,modifiedTime,webViewLink,owners)&pageSize=100`,
        googleAccessToken
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setScripts(data.files || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load Apps Script files';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [googleAccessToken, onError]);

  useEffect(() => {
    if (isGoogleLoggedIn && googleAccessToken) {
      loadScripts();
    }
  }, [isGoogleLoggedIn, googleAccessToken, loadScripts]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isGoogleLoggedIn) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Google Apps Script Manager
          </CardTitle>
          <CardDescription>
            Please log in with Google to view and manage your Apps Script files.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Google Apps Script Files
          </div>
          <Button
            onClick={loadScripts}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          View and manage your Google Apps Script files. This helps verify that the Google authentication is working correctly.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading Apps Script files...</span>
          </div>
        ) : scripts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No Google Apps Script files found.</p>
            <p className="text-sm mt-2">
              Create your first script using the main interface, or check if you have any existing scripts in your Google Drive.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Found {scripts.length} Apps Script file{scripts.length !== 1 ? 's' : ''}
            </div>
            
            {scripts.map((script) => (
              <Card key={script.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{script.name}</h3>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Created: {formatDate(script.createdTime)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Modified: {formatDate(script.modifiedTime)}</span>
                        </div>
                        {script.owners && script.owners.length > 0 && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Owner: {script.owners[0].displayName || script.owners[0].emailAddress}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3">
                        <Badge variant="secondary" className="text-xs">
                          ID: {script.id}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(script.webViewLink, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in Google
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 
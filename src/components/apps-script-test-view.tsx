import type React from 'react';
import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useGoogleAuth } from '@/lib/google-auth';
import { CheckCircle, XCircle, RefreshCw, FileCode, FolderOpen, Plus } from 'lucide-react';
import AppsScriptManager from './apps-script-manager';
import { callGoogleScriptAPI, callGoogleDriveAPI } from '@/lib/google-api-proxy';

interface PermissionTest {
  name: string;
  description: string;
  test: () => Promise<boolean>;
  icon: React.ReactNode;
}

export default function AppsScriptTestView() {
  const { accessToken, isLoggedIn } = useGoogleAuth();
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({});
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const permissionTests: PermissionTest[] = [
    {
      name: 'List Apps Script Projects',
      description: 'Check if we can list your Google Apps Script projects',
      icon: <FolderOpen className="h-5 w-5" />,
      test: async () => {
        if (!accessToken) return false;
        
        try {
          const response = await callGoogleScriptAPI('projects', accessToken);
          return response.ok;
        } catch (err) {
          console.error('List projects test failed:', err);
          return false;
        }
      },
    },
    {
      name: 'Create Apps Script Project',
      description: 'Check if we can create new Apps Script projects',
      icon: <Plus className="h-5 w-5" />,
      test: async () => {
        if (!accessToken) return false;
        
        try {
          // Test by listing projects instead of OPTIONS request
          const response = await callGoogleScriptAPI('projects', accessToken);
          return response.ok;
        } catch (err) {
          console.error('Create project test failed:', err);
          return false;
        }
      },
    },
    {
      name: 'Access Drive Files',
      description: 'Check if we can access Google Drive for script files',
      icon: <FileCode className="h-5 w-5" />,
      test: async () => {
        if (!accessToken) return false;
        
        try {
          const response = await callGoogleDriveAPI(
            `files?q=mimeType='application/vnd.google-apps.script'&pageSize=1`,
            accessToken
          );
          
          return response.ok;
        } catch (err) {
          console.error('Drive access test failed:', err);
          return false;
        }
      },
    },
  ];

  const runAllTests = async () => {
    if (!isLoggedIn || !accessToken) {
      setError('Please login with Google first');
      return;
    }

    setIsRunningTests(true);
    setError(null);
    const results: Record<string, boolean | null> = {};

    for (const test of permissionTests) {
      try {
        results[test.name] = await test.test();
      } catch (err) {
        console.error(`Test "${test.name}" failed:`, err);
        results[test.name] = false;
      }
    }

    setTestResults(results);
    setIsRunningTests(false);
  };

  const getTestIcon = (testName: string) => {
    const result = testResults[testName];
    if (result === null || result === undefined) {
      return <div className="h-5 w-5 rounded-full bg-gray-200" />;
    }
    return result ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <XCircle className="h-5 w-5 text-red-600" />
    );
  };

  const handleError = (error: string) => {
    setError(error);
  };

  if (!isLoggedIn) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Apps Script Permission Test</CardTitle>
          <CardDescription>
            Please login with Google to test Apps Script permissions
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Apps Script Permission Test</CardTitle>
          <CardDescription>
            Test your Google account permissions for Apps Script operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={runAllTests}
              disabled={isRunningTests}
              className="w-full"
            >
              {isRunningTests ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Run Permission Tests
                </>
              )}
            </Button>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              {permissionTests.map((test) => (
                <div
                  key={test.name}
                  className="flex items-start gap-3 p-3 border rounded-lg"
                >
                  <div className="mt-0.5">{test.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-medium">{test.name}</h3>
                    <p className="text-sm text-gray-600">{test.description}</p>
                  </div>
                  <div className="mt-0.5">
                    {getTestIcon(test.name)}
                  </div>
                </div>
              ))}
            </div>

            {Object.keys(testResults).length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-blue-700 text-sm">
                  {Object.values(testResults).every(r => r === true) 
                    ? '✅ All permissions are working correctly!'
                    : '⚠️ Some permissions may need to be granted. Please check your Google account settings.'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Apps Script Manager Component */}
      <AppsScriptManager
        googleAccessToken={accessToken}
        isGoogleLoggedIn={isLoggedIn}
        onError={handleError}
      />
    </div>
  );
} 
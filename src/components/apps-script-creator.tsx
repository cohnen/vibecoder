import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { useGoogleAuth } from '@/lib/google-auth';
import { Plus, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { callGoogleScriptAPI } from '@/lib/google-api-proxy';
import { generateScriptName } from '@/lib/gemini';

interface AppsScriptCreatorProps {
  scriptCode: string;
  userDescription: string; // The original user input/description
  geminiApiKey?: string;
  googleAccessToken?: string;
  onSuccess?: (projectId: string, webViewLink: string) => void;
  onError?: (error: string) => void;
}

export default function AppsScriptCreator({ 
  scriptCode, 
  userDescription,
  geminiApiKey,
  googleAccessToken,
  onSuccess,
  onError 
}: AppsScriptCreatorProps) {
  const { isLoggedIn } = useGoogleAuth();
  const accessToken = googleAccessToken;
  const [isCreating, setIsCreating] = useState(false);
  const [scriptName, setScriptName] = useState('');
  const [scriptDescription, setScriptDescription] = useState(userDescription);
  const [createdProject, setCreatedProject] = useState<{ id: string; webViewLink: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingName, setIsGeneratingName] = useState(false);

  // Auto-generate script name when component mounts
  React.useEffect(() => {
    if (userDescription && geminiApiKey && !scriptName) {
      generateAutoScriptName();
    }
  }, [userDescription, geminiApiKey, scriptName]);

  const generateAutoScriptName = async () => {
    if (!geminiApiKey || !userDescription) return;
    
    setIsGeneratingName(true);
    try {
      const result = await generateScriptName(userDescription, geminiApiKey);
      if (result.success && result.name) {
        setScriptName(result.name);
      } else {
        // Fallback to a simple name based on description
        const fallbackName = `${userDescription
          .split(' ')
          .slice(0, 3)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join('')}Script`;
        setScriptName(fallbackName);
      }
    } catch (error) {
      console.error('Failed to generate script name:', error);
      // Fallback name
      setScriptName('VibeCoder Script');
    } finally {
      setIsGeneratingName(false);
    }
  };

  const createAppsScriptProject = async () => {
    console.log('Creating Apps Script project with token:', accessToken ? 'Token present' : 'No token');
    
    if (!accessToken || !scriptCode) {
      const errorMsg = !accessToken ? 'No Google access token available. Please login with Google.' : 'Missing script code';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Step 1: Create the Apps Script project
      const createResponse = await callGoogleScriptAPI('projects', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          title: scriptName,
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        console.error('Create project error:', {
          status: createResponse.status,
          statusText: createResponse.statusText,
          errorData
        });
        throw new Error(errorData.error?.message || `Failed to create project (${createResponse.status})`);
      }

      const project = await createResponse.json();
      const projectId = project.scriptId;

      // Step 2: Update the project content with the generated script
      const files = [
        {
          name: 'Code',
          type: 'SERVER_JS',
          source: scriptCode,
        },
        {
          name: 'appsscript',
          type: 'JSON',
          source: JSON.stringify({
            timeZone: 'America/New_York',
            dependencies: {},
            exceptionLogging: 'STACKDRIVER',
            runtimeVersion: 'V8',
            oauthScopes: [
              'https://www.googleapis.com/auth/script.external_request',
              'https://www.googleapis.com/auth/spreadsheets',
              'https://www.googleapis.com/auth/documents',
              'https://www.googleapis.com/auth/drive',
              'https://www.googleapis.com/auth/script.send_mail',
              'https://www.googleapis.com/auth/calendar',
              'https://www.googleapis.com/auth/forms'
            ]
          }, null, 2),
        },
      ];

      const updateResponse = await callGoogleScriptAPI(`projects/${projectId}/content`, accessToken, {
        method: 'PUT',
        body: JSON.stringify({ files }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error?.message || 'Failed to update project content');
      }

      // Step 3: Set script properties (including GEMINI_API_KEY if provided)
      if (geminiApiKey) {
        try {
          // Add a helper script to set properties
          const helperScript = `
function setInitialProperties() {
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty('GEMINI_API_KEY', '${geminiApiKey}');
  console.log('GEMINI_API_KEY has been set in script properties');
}

// Run this function once to set up your API key
// You can delete this function after running it
`;

          // Update the project with the helper script
          const updatedFiles = [
            ...files,
            {
              name: 'Setup',
              type: 'SERVER_JS',
              source: helperScript,
            }
          ];

          const propertiesResponse = await callGoogleScriptAPI(`projects/${projectId}/content`, accessToken, {
            method: 'PUT',
            body: JSON.stringify({ files: updatedFiles }),
          });

          if (!propertiesResponse.ok) {
            console.warn('Failed to add setup script, but project was created successfully');
          }
        } catch (err) {
          console.warn('Failed to add setup script:', err);
          // Don't fail the entire operation if setup script can't be added
        }
      }

      // Step 4: Get the web view link
      const webViewLink = `https://script.google.com/d/${projectId}/edit`;
      
      setCreatedProject({ id: projectId, webViewLink });
      onSuccess?.(projectId, webViewLink);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create Apps Script project';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create Apps Script Project</CardTitle>
          <CardDescription>
            Please login with Google to create Apps Script projects
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create Apps Script Project</CardTitle>
          <CardDescription>
            Google access token not available. Please logout and login again to refresh permissions.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (createdProject) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">🎉 Apps Script Created Successfully!</CardTitle>
          <CardDescription className="text-green-700">
            Your script has been created in Google Apps Script and is ready to use.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-md border border-green-200">
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Project ID:</p>
                  <p className="font-mono text-sm text-gray-600">{createdProject.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Direct Link:</p>
                  <p className="font-mono text-xs text-blue-600 break-all">{createdProject.webViewLink}</p>
                </div>
              </div>
            </div>

            {geminiApiKey && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>📝 Next Steps:</strong> Your GEMINI_API_KEY has been added to the project. 
                  Run the <code className="bg-blue-100 px-1 rounded">setInitialProperties()</code> function 
                  once in the Apps Script editor to activate it.
                </p>
              </div>
            )}
            
            <Button
              onClick={() => window.open(createdProject.webViewLink, '_blank')}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Google Apps Script Editor
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                setCreatedProject(null);
                setScriptName('');
                setScriptDescription(userDescription);
                // Re-generate name for new script
                if (userDescription && geminiApiKey) {
                  generateAutoScriptName();
                }
              }}
              className="w-full"
            >
              Create Another Script
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Apps Script Project</CardTitle>
        <CardDescription>
          Create a new Google Apps Script project with your generated code
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label htmlFor="script-name" className="block text-sm font-medium mb-1">
              Script Name {isGeneratingName && <span className="text-sm text-gray-500">(generating...)</span>}
            </label>
            <Input
              id="script-name"
              value={scriptName}
              onChange={(e) => setScriptName(e.target.value)}
              placeholder={isGeneratingName ? "Generating script name..." : "Enter script name"}
              disabled={isCreating || isGeneratingName}
            />
          </div>

          <div>
            <label htmlFor="script-description" className="block text-sm font-medium mb-1">
              Description (Optional)
            </label>
            <Textarea
              id="script-description"
              value={scriptDescription}
              onChange={(e) => setScriptDescription(e.target.value)}
              placeholder="Enter a description for your script"
              rows={3}
              disabled={isCreating}
            />
          </div>

          <div>
            <label htmlFor="script-preview" className="block text-sm font-medium mb-1">
              Script Preview
            </label>
            <div id="script-preview" className="bg-gray-50 border rounded-md p-3 max-h-40 overflow-y-auto">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                {scriptCode.substring(0, 500)}
                {scriptCode.length > 500 && '...'}
              </pre>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <Button
            onClick={createAppsScriptProject}
            disabled={isCreating || !scriptName.trim()}
            className="w-full"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Project...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Apps Script Project
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 
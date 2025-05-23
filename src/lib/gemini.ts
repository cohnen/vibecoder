// Utility functions for Gemini API integration
let geminiAppHelper = '';
let geminiAppDocs = '';
let sampleCodeAndHelpers = '';

// Function to fetch static text files on app initialization
export async function loadStaticPrompts(): Promise<boolean> {
  try {
    const [geminiAppResponse, sampleCodeResponse, geminiAppDocsResponse] = await Promise.all([
      fetch('/GeminiApp.txt'),
      fetch('/AllCodeSamples.txt'),
      fetch('/GeminiAppDocs.md')
    ]);
    
    if (!geminiAppResponse.ok || !sampleCodeResponse.ok || !geminiAppDocsResponse.ok) {
      console.error('Failed to load one or more static prompt files');
      return false;
    }
    
    geminiAppHelper = await geminiAppResponse.text();
    sampleCodeAndHelpers = await sampleCodeResponse.text();
    geminiAppDocs = await geminiAppDocsResponse.text();
    
    console.log('Successfully loaded static prompt files');
    return true;
  } catch (error) {
    console.error('Error loading static prompt files:', error);
    return false;
  }
}

// Interface for processed content
interface ProcessedContent {
  code: string;
  explanation: string;
}

// Verify if the API key is valid by making a simple test request
export async function verifyApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    
    if (!response.ok) {
      console.error('API key verification failed:', response.status);
      return false;
    }
    
    const data = await response.json();
    // Check if we got a valid response with models
    return Array.isArray(data.models) && data.models.length > 0;
  } catch (error) {
    console.error('API key verification error:', error);
    return false;
  }
}

// Parse content to separate code blocks from explanations
function processGeminiResponse(content: string, includeHelper = true): ProcessedContent {
  const result: ProcessedContent = { 
    code: '',
    explanation: ''
  };
  
  // Simple regex to find code blocks
  const regex = /```[\w]*\n([\s\S]*?)```/g;
  const codeBlocks: string[] = [];
  
  // Extract all code blocks
  let match: RegExpExecArray | null = regex.exec(content);
  while (match !== null) {
    if (match[1]) {
      codeBlocks.push(match[1].trim());
    }
    match = regex.exec(content);
  }
  
  if (codeBlocks.length > 0) {
    // Find the largest code block (likely the complete implementation)
    result.code = codeBlocks.reduce((a, b) => a.length > b.length ? a : b, '');
    
    // For explanation, replace all code blocks with empty strings
    let explanationText = content;
    
    // Reset regex
    regex.lastIndex = 0;
    
    let tempMatch: RegExpExecArray | null = regex.exec(content);
    while (tempMatch !== null) {
      explanationText = explanationText.replace(tempMatch[0], '');
      tempMatch = regex.exec(content);
    }
    
    result.explanation = explanationText.trim();
  } else {
    // If no code blocks found, treat everything as code
    result.code = content;
  }

  // Add the gemini helper content to the generated code only if includeHelper is true
  // we only add the helper if it's not already in the code
  if (includeHelper && geminiAppHelper && !result.code.includes('///////GEMINI HELPER')) {
    result.code = `${result.code}
    ///////GEMINI HELPER
    ${geminiAppHelper}`;
  }
  
  return result;
}

// Creates the system prompt needed for script generation
function createSystemPrompt(options: { includeHelper: boolean; includeSampleCode: boolean }): string {
  return `You are an expert Google Apps Script developer with years of experience creating 
  automated workflows for Google Sheets, Docs, and other Google products. Your task is to write a well-commented, 
  ready-to-use Apps Script that precisely fulfills the user's request. 
  
  Format your response with:
  1. First, provide the complete code enclosed in a code block with \`\`\`js syntax
  2. Then, provide a brief explanation of how the script works and any steps for deployment or usage. Explain how to setup GEMINI_API_KEY in the project properties if gemini is used.
  
  Make sure your code is complete, production-ready, and addresses all key aspects of the request. 
  Give all the code in one file. 
  All the code, dont abbreviate.
  Important: Add at the begining of the script all required scope permissions as comments.
  In case you want to add some html code to the script do inline html, and try to avoid external files for html. 
  All content should be together in one single js block.
  Use async and await for all functions that use promises but ensure you encapsulate them in a function that is not async.

  For example: Just add what is needed to the top of the script.
  /**
   * @OnlyCurrentDoc // Grants access to the current spreadsheet
   * @OAuthScope https://www.googleapis.com/auth/documents // Grants access to create/modify Google Docs
   * @OAuthScope https://www.googleapis.com/auth/drive // Grants access to Drive files/folders (copying, finding, trashing)
   * @OAuthScope https://www.googleapis.com/auth/script.send_mail // Grants permission to send email as the user
   * @OAuthScope https://www.googleapis.com/auth/script.container.ui // Grants permission show UI elements like alerts/sidebars
   * @OAuthScope https://www.googleapis.com/auth/spreadsheets.currentonly // Explicit scope for current sheet access
   */

  ${options.includeHelper ? `
  <gemini-app-helper>
  If you plan to use any LLM/AI generative functions you will have in context a helper that it's used like these instructions:
  (not all the problems will require AI/LLM functions, but you will have them available if needed)
  const genAI = new GeminiApp(PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY"));

  ${geminiAppDocs || '// Gemini helper not loaded'}
  </gemini-app-helper>
  ` : ''}

  ${options.includeSampleCode ? `
  <sample-code-and-helpers>
  ${sampleCodeAndHelpers || '// Sample code not loaded'}
  </sample-code-and-helpers>
  ` : ''}
  `;
}

// Function to generate code using Gemini API
export async function generateScript(
  prompt: string,
  apiKey: string,
  model = 'gemini-2.5-pro',
  options = { includeHelper: true, includeSampleCode: true }
): Promise<{ success: boolean; content?: string; code?: string; explanation?: string; error?: string; responseTimeMs?: number }> {
  // Map UI model IDs to actual API model IDs
  let modelId;
  switch (model) {
    case 'gemini-2.5-pro':
      modelId = 'gemini-2.5-pro-preview-03-25';
      break;
    case 'gemini-pro':
      modelId = 'gemini-1.5-pro';
      break;
    case 'gemini-2.5-flash':
      modelId = 'gemini-2.5-flash-preview-04-17';
      break;
    case 'gemini-flash':
      modelId = 'gemini-2.0-flash';
      break;
    default:
      modelId = 'gemini-2.5-pro-preview-03-25';
  }
  
  // Start timing the request
  const startTime = performance.now();
  
  try {
    // Check if static files are loaded, if not try to load them
    if (!geminiAppHelper || !sampleCodeAndHelpers) {
      await loadStaticPrompts();
    }

    const systemPrompt = createSystemPrompt(options);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { 
                  text: systemPrompt
                },
                { 
                  text: prompt 
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 50000,
          }
        }),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      // Calculate elapsed time
      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);
      
      return { 
        success: false, 
        error: `API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`,
        responseTimeMs
      };
    }
    
    const data = await response.json();
    
    // Extract the generated text from the response
    const generatedContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // Calculate elapsed time
    const endTime = performance.now();
    const responseTimeMs = Math.round(endTime - startTime);
    
    if (!generatedContent) {
      return { 
        success: false, 
        error: 'No content was generated',
        responseTimeMs
      };
    }
    
    // Process the response to separate code from explanation, passing the includeHelper option
    const processed = processGeminiResponse(generatedContent, options.includeHelper);
    
    return { 
      success: true, 
      content: generatedContent,
      code: processed.code,
      explanation: processed.explanation,
      responseTimeMs
    };
    
  } catch (error) {
    // Calculate elapsed time even on error
    const endTime = performance.now();
    const responseTimeMs = Math.round(endTime - startTime);
    
    console.error('Script generation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      responseTimeMs 
    };
  }
}

// Stream interface for response handling
export interface StreamResponse {
  done: boolean;
  content?: string;
  error?: string;
  responseTimeMs?: number;
  firstChunkTimeMs?: number;
}

// Function to generate code using Gemini API with streaming
export async function* generateScriptStream(
  prompt: string,
  apiKey: string,
  model = 'gemini-pro',
  options = { includeHelper: true, includeSampleCode: true }
): AsyncGenerator<StreamResponse> {
  // Map UI model IDs to actual API model IDs
  let modelId;
  switch (model) {
    case 'gemini-2.5-pro':
      modelId = 'gemini-2.5-pro-preview-03-25';
      break;
    case 'gemini-pro':
      modelId = 'gemini-1.5-pro';
      break;
    case 'gemini-2.5-flash':
      modelId = 'gemini-2.5-flash-preview-04-17';
      break;
    case 'gemini-flash':
      modelId = 'gemini-2.0-flash';
      break;
    default:
      modelId = 'gemini-2.5-pro-preview-03-25';
  }
  
  // Start timing the request
  const startTime = performance.now();
  let firstChunkTime: number | null = null;
  
  try {
    // Check if static files are loaded, if not try to load them
    if (!geminiAppHelper || !sampleCodeAndHelpers) {
      await loadStaticPrompts();
    }

    const systemPrompt = createSystemPrompt(options);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { 
                  text: systemPrompt
                },
                { 
                  text: prompt 
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 50000,
          }
        }),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API streaming error:', errorData);
      
      // Calculate elapsed time
      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);
      
      yield { 
        done: true, 
        error: `API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`,
        responseTimeMs
      };
      return;
    }
    
    if (!response.body) {
      // Calculate elapsed time
      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);
      
      yield { 
        done: true, 
        error: 'Stream response body is null',
        responseTimeMs
      };
      return;
    }
    
    // Process the streamed response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedContent = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        // Process the final accumulated content
        const endTime = performance.now();
        const responseTimeMs = Math.round(endTime - startTime);
        const firstChunkTimeMs = firstChunkTime ? Math.round(firstChunkTime - startTime) : null;
        
        if (accumulatedContent) {
          // Don't process content twice - just return the accumulated content
          yield { 
            done: true, 
            content: accumulatedContent,
            responseTimeMs,
            firstChunkTimeMs: firstChunkTimeMs || undefined
          };
        } else {
          yield { 
            done: true, 
            error: 'No content was generated in the stream',
            responseTimeMs,
            firstChunkTimeMs: firstChunkTimeMs || undefined
          };
        }
        break;
      }
      
      try {
        const chunk = decoder.decode(value, { stream: true });
        // The API returns JSON objects on each line
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.includes('"text":')) {
            try {
              // Parse the JSON response line
              const data = JSON.parse(line);
              // Extract content from the chunk
              const chunkContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              accumulatedContent += chunkContent;
              
              // Record time of first chunk if not already set
              if (!firstChunkTime && chunkContent.trim()) {
                firstChunkTime = performance.now();
              }
              
              const currentTime = performance.now();
              const responseTimeMs = Math.round(currentTime - startTime);
              const firstChunkTimeMs = firstChunkTime ? Math.round(firstChunkTime - startTime) : undefined;
              
              // Yield the intermediate chunk
              yield {
                done: false,
                content: chunkContent,
                responseTimeMs,
                firstChunkTimeMs
              };
              
            } catch (parseError) {
              console.warn('Error parsing JSON chunk:', parseError);
              // Continue even if one chunk fails to parse
            }
          }
        }
      } catch (decodeError) {
        const endTime = performance.now();
        const responseTimeMs = Math.round(endTime - startTime);
        const firstChunkTimeMs = firstChunkTime ? Math.round(firstChunkTime - startTime) : undefined;
        
        console.error('Error decoding stream chunk:', decodeError);
        yield { 
          done: true, 
          error: 'Error processing streamed response',
          responseTimeMs,
          firstChunkTimeMs
        };
        break;
      }
    }
  } catch (error) {
    const endTime = performance.now();
    const responseTimeMs = Math.round(endTime - startTime);
    const firstChunkTimeMs = firstChunkTime ? Math.round(firstChunkTime - startTime) : undefined;
    
    console.error('Script streaming error:', error);
    yield { 
      done: true, 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      responseTimeMs,
      firstChunkTimeMs
    };
  }
}

// Generate idea chips using Gemini
export async function generateIdeaChips(
  apiKey: string,
  model = 'gemini-2.0-flash'
): Promise<{ success: boolean; ideas?: Array<{short: string; long: string}>; error?: string }> {
   
  try {
    const prompt = `Generate 5 specific, practical ideas for Google Apps Scripts that would be useful for business professionals. 
    Each idea should have both a short title (5-7 words) and a detailed description (1-2 sentences).
    The ideas should focus on common spreadsheet, document, or email workflows that can be automated with Apps Script.
    
    Format your response as a JSON array with this exact structure:
    [
      {
        "short": "Short title for idea 1",
        "long": "Detailed description of the first idea that clearly explains what the script would do"
      },
      ...and so on for all 5 ideas
    ]
    
    Return only valid JSON with no additional text.`;
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
            response_mime_type: "application/json"
          },
        }),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini idea generation error:', errorData);
      return { 
        success: false, 
        error: `API error (${response.status}): ${errorData.error?.message || 'Unknown error'}` 
      };
    }
    
    const data = await response.json();
    
    // Extract the generated text from the response
    const generatedContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedContent) {
      return { 
        success: false, 
        error: 'No content was generated' 
      };
    }
    
    try {
      // Parse the JSON response
      const ideas = JSON.parse(generatedContent);
      
      // Validate the structure
      if (!Array.isArray(ideas) || ideas.length === 0 || !ideas[0].short || !ideas[0].long) {
        console.error('Invalid idea format returned:', ideas);
        return { 
          success: false, 
          error: 'Generated ideas have invalid format' 
        };
      }
      
      return { 
        success: true, 
        ideas: ideas.slice(0, 5) // Ensure we only get max 5 ideas
      };
    } catch (parseError) {
      console.error('Error parsing idea JSON:', parseError, 'Content:', generatedContent);
      return { 
        success: false, 
        error: 'Failed to parse generated ideas' 
      };
    }
  } catch (error) {
    console.error('Idea generation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
} 
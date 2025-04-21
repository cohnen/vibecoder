// Utility functions for Gemini API integration

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

interface ProcessedContent {
  code: string;
  explanation: string;
}

// Parse content to separate code blocks from explanations
function processGeminiResponse(content: string): ProcessedContent {
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
  
  return result;
}

// Function to generate code using Gemini API
export async function generateScript(
  prompt: string,
  apiKey: string,
  model = 'gemini-pro'
): Promise<{ success: boolean; content?: string; code?: string; explanation?: string; error?: string }> {
  // If model is not correctly formatted, use default
  const modelId = model === 'gemini-flash' ? 'gemini-1.5-flash' : 'gemini-1.5-pro';
  
  try {
    const systemPrompt = `You are an expert Google Apps Script developer with years of experience creating 
    automated workflows for Google Sheets, Docs, and other Google products. Your task is to write a well-commented, 
    ready-to-use Apps Script that precisely fulfills the user's request. 
    
    Format your response with:
    1. First, provide the complete code enclosed in a code block with \`\`\`js syntax
    2. Then, provide a brief explanation of how the script works and any steps for deployment or usage
    
    Make sure your code is complete, production-ready, and addresses all key aspects of the request.`;
    
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
            maxOutputTokens: 8192,
          }
        }),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
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
    
    // Process the response to separate code from explanation
    const processed = processGeminiResponse(generatedContent);
    
    return { 
      success: true, 
      content: generatedContent,
      code: processed.code,
      explanation: processed.explanation
    };
    
  } catch (error) {
    console.error('Script generation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// Generate idea chips using Gemini
export async function generateIdeaChips(
  apiKey: string,
  model = 'gemini-flash'
): Promise<{ success: boolean; ideas?: Array<{short: string; long: string}>; error?: string }> {
  // If model is not correctly formatted, use default
  const modelId = 'gemini-2.0-flash';
  
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
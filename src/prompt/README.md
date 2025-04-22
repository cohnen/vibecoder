# Prompt Directory

This directory contains text files used as templates/prompts for the Gemini AI code generation functionality. These files are automatically loaded at application startup from the public directory.

## Files

- **GeminiApp.txt**: Contains the Google Apps Script class definition for the GeminiApp helper that provides methods to interact with Google's Gemini API within Google Apps Script.
  
- **AllCodeSamples.txt**: Contains sample code snippets for common Google Apps Script operations that serve as examples for the AI assistant.

## Implementation Details

- These files are statically served from the `/public` directory
- They are fetched at runtime when the application initializes
- The content is cached in memory for use with the Gemini API calls

## Updating the Files

To update these files:
1. Edit both versions (in both `src/prompt/` and `public/`) to keep them in sync
2. The `src/prompt/` versions serve as development references
3. The `public/` versions are the ones actually used by the application 
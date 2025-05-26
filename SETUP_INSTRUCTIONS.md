# Quick Setup Guide for Google Authentication

## Current Status ✅

The Google authentication implementation is complete and ready to test! Here's what has been implemented:

### ✅ Completed Features:
1. **Google OAuth Login** - Users can login with their Google account
2. **Apps Script Creation** - Create Google Apps Script projects directly from the interface
3. **Apps Script Management** - View existing Apps Script files
4. **Permission Testing** - Test Google API permissions
5. **CORS Proxy** - Cloudflare Worker handles CORS issues with Google APIs

## Quick Start

### 1. Start the Services

You need to run **two terminals**:

**Terminal 1 - Start the Worker:**
```bash
npx wrangler dev --config wrangler.dev.jsonc --port 8787
```

**Terminal 2 - Start the App:**
```bash
npm run dev
```

### 2. Set up Google OAuth (Required)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable these APIs:
   - **Google Apps Script API** (Required for creating projects)
   - **Google Drive API** (Required for file management)
   - Make sure both APIs are enabled and have proper quotas
4. Create OAuth 2.0 credentials:
   - Type: Web application
   - Authorized origins: `http://localhost:5174`
5. Copy the Client ID
6. Create `.env` file:
   ```
   VITE_GOOGLE_CLIENT_ID=your-client-id-here
   ```

### 3. Test the Features

1. **Visit**: http://localhost:5174
2. **Login**: Click "Login with Google" in the header
3. **Generate a script**: Use the main interface to generate a script
4. **Create in Google**: Click the "Create in Google" button next to "Copy to Clipboard"
5. **Access your script**: Click "Open in Google Apps Script Editor" from the success dialog
6. **Test permissions**: Visit http://localhost:5174/test to run permission tests

## What Works Now

- ✅ Google login/logout
- ✅ Script generation (existing feature)
- ✅ **One-click Apps Script creation** - Create directly in Google with a single click
- ✅ **Automatic API key setup** - GEMINI_API_KEY is automatically added to script properties
- ✅ **Direct links** - Get immediate access to your script in Google Apps Script editor
- ✅ Apps Script file listing and management
- ✅ Permission testing
- ✅ CORS handling via worker proxy

## Troubleshooting

### Worker not starting?
- Make sure you're using the dev config: `--config wrangler.dev.jsonc`
- Check that port 8787 is available

### CORS errors?
- Ensure the worker is running on port 8787
- Test with: `curl http://localhost:8787/api/`

### Login not working?
- Check your Google Client ID in `.env`
- Verify OAuth settings in Google Cloud Console
- Make sure authorized origins include `http://localhost:5174`

## Next Steps

Once you have your Google Client ID:
1. Add it to `.env`
2. Restart both services
3. Test the login flow
4. Try creating an Apps Script project!

## 🎯 New Streamlined Workflow

1. **Generate** your script using VibeCoder
2. **Click "Create in Google"** (appears next to Copy button when logged in)
3. **Customize** the project name if needed
4. **Click "Create Apps Script Project"**
5. **Get instant access** via the direct link provided
6. **Run `setInitialProperties()`** once in the Apps Script editor to activate your API key

The GEMINI_API_KEY from your VibeCoder session is automatically added to the script properties! 🔑

The implementation is complete and ready for testing! 🚀 
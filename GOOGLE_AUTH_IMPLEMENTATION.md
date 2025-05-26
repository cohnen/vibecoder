# Google Authentication Implementation for VibeCoder

## Overview

This document describes the Google OAuth 2.0 authentication implementation added to VibeCoder, which allows users to:
- Login with their Google account
- Create Google Apps Script projects directly from the interface
- View and manage their existing Apps Script files
- Test permissions for Apps Script operations

## Implementation Details

### 1. Dependencies Added

```json
{
  "@react-oauth/google": "latest",
  "react-router-dom": "latest",
  "@types/react-router-dom": "latest"
}
```

### 2. Key Components Created

#### Google Auth Context (`src/lib/google-auth.tsx`)
- Manages Google OAuth authentication state
- Handles login/logout functionality
- Stores access tokens in localStorage
- Provides authentication context to the entire app

#### Google Login Button (`src/components/google-login-button.tsx`)
- Displays login/logout button
- Shows user profile information when logged in
- Handles authentication errors

#### Apps Script Creator (`src/components/apps-script-creator.tsx`)
- Creates new Google Apps Script projects
- Uploads generated code directly to Google
- Provides direct links to edit scripts in Google Apps Script editor

#### Apps Script Test View (`src/components/apps-script-test-view.tsx`)
- Tests Google account permissions
- Verifies access to Apps Script API
- Lists existing Apps Script projects

#### Apps Script Manager (`src/components/apps-script-manager.tsx`)
- Displays user's existing Apps Script files
- Shows file metadata (creation date, modification date, owners)
- Provides links to open scripts in Google

### 3. Routing Setup

Added React Router to enable navigation between:
- Main page (`/`) - Script generation interface
- Test page (`/test`) - Permission testing and Apps Script management

### 4. Required Google OAuth Scopes

```javascript
const SCOPES = [
  'https://www.googleapis.com/auth/script.projects',
  'https://www.googleapis.com/auth/script.projects.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];
```

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Google Apps Script API
   - Google Drive API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized JavaScript origins: 
     - `http://localhost:5173` (development)
     - `http://localhost:5174` (alternative port)
     - Your production domain
   - Authorized redirect URIs: Same as origins

### 2. Environment Configuration

1. Copy `env.template` to `.env`
2. Add your Google Client ID:
   ```
   VITE_GOOGLE_CLIENT_ID=your-client-id-here
   ```

### 3. Running the Application

```bash
# Install dependencies
npm install

# Start the Cloudflare Worker (in one terminal)
npx wrangler dev --config wrangler.dev.jsonc --port 8787

# Start the Vite dev server (in another terminal)
npm run dev
```

## User Flow

1. **Initial Visit**: User sees the main interface with a "Login with Google" button in the header
2. **Login**: Clicking the button initiates Google OAuth flow
3. **After Login**: 
   - User info and logout button appear in header
   - "Create Apps Script Project in Google" button appears after generating a script
   - "Test Permissions" link becomes available
4. **Creating Scripts**: After generating a script, logged-in users can:
   - Click "Create Apps Script Project in Google"
   - Enter a project name
   - The script is automatically created and uploaded
   - Direct link provided to edit in Google Apps Script editor
5. **Permission Testing**: Users can navigate to `/test` to:
   - Run permission tests
   - View their existing Apps Script files
   - Verify API access

## Security Considerations

- Access tokens are stored in localStorage with expiration tracking
- Tokens are automatically cleared on logout
- Token revocation is attempted on logout
- All API calls include proper authorization headers
- **CORS Handling**: Google Apps Script API doesn't support CORS, so we use a Cloudflare Worker as a proxy

## Features Added

1. **Google Login Integration**: Seamless authentication with Google accounts
2. **Direct Script Creation**: No more copy-pasting - scripts are created directly in Google
3. **Script Management**: View and access existing Apps Script projects
4. **Permission Testing**: Verify that all required permissions are granted
5. **Token Management**: Automatic token refresh and expiration handling

## Technical Implementation

### CORS Solution

Google Apps Script API doesn't support CORS (Cross-Origin Resource Sharing), which prevents direct browser-to-API calls. To solve this:

1. **Cloudflare Worker Proxy**: We use a Cloudflare Worker as a proxy server
2. **API Routes**: 
   - `/api/google/script/*` - Proxies to `https://script.googleapis.com/v1/*`
   - `/api/google/drive/*` - Proxies to `https://www.googleapis.com/drive/v3/*`
3. **Authentication**: Access tokens are passed via Authorization headers

### Worker Implementation

The worker (`worker/index.ts`):
- Handles CORS preflight requests
- Forwards API requests to Google with proper authentication
- Returns responses with CORS headers enabled

## Troubleshooting

### Common Issues

1. **"Configuration Error" on startup**
   - Ensure `VITE_GOOGLE_CLIENT_ID` is set in `.env` file
   - Restart the development server after adding the environment variable

2. **Login fails with error**
   - Check that your Google Cloud Console OAuth settings match your current URL
   - Ensure all required APIs are enabled in Google Cloud Console

3. **Permission tests fail or CORS errors**
   - Make sure the Cloudflare Worker is running (`npx wrangler dev`)
   - Check that the worker is accessible at `http://localhost:8787`
   - Verify the API endpoints are enabled in Google Cloud Console

4. **Cannot create Apps Script projects**
   - Verify the user has granted all required scopes
   - Check browser console for specific error messages
   - Ensure the worker proxy is running 
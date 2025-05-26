# VibeCoder by ixigo

VibeCoder is a modern web application that helps users build Google Apps Script applications through a simple, intuitive interface. It leverages the Gemini API to generate ready-to-use Google Apps Scripts based on natural language descriptions.

## Features

- **AI-Powered Script Generation**: Describe what you want to build, and VibeCoder generates complete, production-ready Google Apps Scripts
- **Google Authentication**: Login with Google to manage your Apps Script projects
- **Direct Script Creation**: Create Apps Script projects directly from the interface without copy-pasting
- **Apps Script Management**: View and manage your existing Apps Script files
- **Permission Testing**: Test your Google account permissions for Apps Script operations
- **Interactive UI**: Modern, responsive design with animations and visual feedback
- **Voice Input**: Speak your script requirements instead of typing
- **Script Refinement**: Get feedback on generated scripts and request improvements
- **Idea Suggestions**: Browse AI-generated script ideas for inspiration
- **Token Usage Optimization**: Control token usage with customizable settings
- **Syntax Highlighting**: Easily read and understand the generated code
- **Detailed Explanations**: Each script comes with instructions on how to use and deploy it

## Technology Stack

- React 19
- TypeScript
- Vite
- Framer Motion for animations
- TailwindCSS for styling
- Gemini AI API integration
- Cloudflare Workers for deployment

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn
- Gemini API key for script generation
- Google Cloud Console project with OAuth 2.0 credentials (for Google login functionality)

### Installation

```bash
# Clone the repository
git clone https://github.com/cohnen/vibecoder.git

# Navigate to project directory
cd vibecoder

# Install dependencies
npm install
# or
yarn install
```

### Configuration

1. **Set up Google OAuth 2.0 credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Apps Script API
   - Create OAuth 2.0 credentials (Web application type)
   - Add authorized JavaScript origins: `http://localhost:5173` (for development)
   - Add authorized redirect URIs: `http://localhost:5173` (for development)

2. **Configure environment variables:**
   - Copy `env.template` to `.env`
   - Add your Google Client ID: `VITE_GOOGLE_CLIENT_ID=your-client-id-here`

### Development

```bash
# Start development server
npm run dev
# or
yarn dev
```

### Build and Deploy

```bash
# Build for production
npm run build
# or
yarn build

# Deploy to Cloudflare
npm run deploy
# or
yarn deploy
```

## Hosted Version

A free hosted version of VibeCoder is available at [https://vibecoder.ixigo.workers.dev/](https://vibecoder.ixigo.workers.dev/) for a limited time. Feel free to try it out without setting up your own instance.

## Project Structure

The project is organized as a modern React application with the following structure:
- `/src`: Core source files
- `/app`: Main application components
- `/components`: Reusable UI components
- `/lib`: Utility functions and API integration
- `/public`: Static assets and helper files
- `/worker`: Cloudflare Worker configuration

## Attribution

VibeCoder was built by Ernesto Cohnen (ernesto@ixigo.com) under the promotion of ixigo. It serves as a platform for building Google App Scripts quickly and efficiently.

## License

MIT License

Copyright (c) 2025 Ernesto Cohnen, ixigo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

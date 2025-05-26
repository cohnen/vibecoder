import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/app.tsx'
import { loadStaticPrompts } from './lib/gemini'

// Load the static prompt files on app initialization
loadStaticPrompts().catch(error => {
  console.error('Failed to load static prompt files:', error);
});

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

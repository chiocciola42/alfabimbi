import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/fredoka/latin-400.css';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import '@fontsource/quicksand/latin-500.css';
import '@fontsource/quicksand/latin-600.css';
import '@fontsource/quicksand/latin-700.css';
import App from './App.tsx';
import './index.css';

// Registers the service worker (offline support); new versions activate automatically.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

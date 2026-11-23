import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { installGlobalErrorListeners, rootErrorHandlers } from './lib/telemetry';
import { reportWebVitals } from './lib/webVitals';

async function enableMocking() {
  // There's no real backend: the hosted build opts in to the mock API with VITE_ENABLE_MOCKS.
  if (!import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS !== 'true') {
    return;
  }

  try {
    const { worker } = await import('./mocks/browser');
    // The worker file sits under the base path (/<repo>/ on GitHub Pages), not the site root.
    await worker.start({
      serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    });
    console.log('Mock Service Worker started');
  } catch (error) {
    console.error('Failed to start Mock Service Worker:', error);
  }
}

// Before anything else runs, so no early error is missed.
installGlobalErrorListeners();

enableMocking().then(() => {
  // Every environment: the console sink replaces React's default error message.
  ReactDOM.createRoot(document.getElementById('root')!, rootErrorHandlers).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  reportWebVitals();
});

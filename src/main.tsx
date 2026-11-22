import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

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

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

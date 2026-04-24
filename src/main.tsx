import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Dev-only: expose save service test harness on window
if (import.meta.env.DEV) {
  import('./services/__tests__/saveService.test').then((m) => {
    const w = window as unknown as Record<string, unknown>;
    w.__runSaveTests = m.runTests;
    w.__testThumbnailRoundTrip = m.testThumbnailRoundTrip;
  });
}

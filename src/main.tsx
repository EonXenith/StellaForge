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
    (window as unknown as Record<string, unknown>).__runSaveTests = m.runTests;
  });
}

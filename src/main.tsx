import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Completely disable PWA / Service Worker and clear any active registrations
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().catch(() => {});
    }
  }).catch(() => {});
}

// Ensure light mode is strictly enforced and any stored dark preferences are cleared
if (typeof document !== 'undefined') {
  document.documentElement.classList.remove('dark');
  document.body.classList.remove('dark');
  document.documentElement.setAttribute('data-theme', 'light');
  document.documentElement.style.colorScheme = 'light';
}
try {
  localStorage.removeItem('nganga_theme_preference');
  localStorage.removeItem('sialkot_theme');
} catch {
  // Ignore storage errors
}

createRoot(document.getElementById('root')!).render(
  <App />
);


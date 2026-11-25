import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './styles.css';
import App from './App';
import Gallery from './Gallery';

if (import.meta.env.DEV && new URLSearchParams(location.search).has('demo')) {
  import('./demo').then((m) => m.seedDemo());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {import.meta.env.DEV && new URLSearchParams(location.search).has('gallery') ? <Gallery /> : <App />}
  </StrictMode>,
);

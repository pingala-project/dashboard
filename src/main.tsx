import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'katex/dist/katex.min.css'
import './index.css'
import App from './App.tsx'

// Apply persisted accent color & theme before first paint
const savedAccent = localStorage.getItem('pingala_accent');
if (savedAccent) {
  document.documentElement.style.setProperty('--accent', savedAccent);
}
try {
  const savedSettings = localStorage.getItem('pingala_app_settings_v1');
  if (savedSettings) {
    const s = JSON.parse(savedSettings);
    if (s?.appearance?.theme && s.appearance.theme !== 'system') {
      document.documentElement.setAttribute('data-theme', s.appearance.theme);
    }
    if (s?.display?.fontFamily) {
      document.documentElement.setAttribute('data-font', s.display.fontFamily);
    }
    if (s?.display?.fontSize) {
      document.documentElement.setAttribute('data-font-size', s.display.fontSize);
    }
    if (s?.display?.readingWidth) {
      document.documentElement.setAttribute('data-reading-width', s.display.readingWidth);
    }
  }
} catch { /* ignore */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import DownloadPage from './features/download/DownloadPage.jsx'

// Public /download page — rendered before App so it needs no auth and never
// mounts the app's stores/tracking. Share this URL to let people install.
const isDownload = window.location.pathname.replace(/\/+$/, '') === '/download'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isDownload ? <DownloadPage /> : <App />}
  </StrictMode>,
)

// Public app-download page, served at /download (no auth — see App.jsx, which
// short-circuits to this before the login gate). Kept self-contained: all
// styles live in the scoped <style> block below so it doesn't depend on the
// rest of the app's CSS.

// Direct APK artifact from EAS (preview build, OTA-enabled). Update when a new
// native build is published.
const ANDROID_APK_URL =
  'https://expo.dev/artifacts/eas/Ns4OA1piRDy82wudhBtFqDynJqVGcLrITAm5My_pdrE.apk';

const CSS = `
.dl-root {
  --dl-bg:#0b0d10; --dl-text:#f5f7fa; --dl-muted:#9aa4b2;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  background:radial-gradient(1200px 600px at 50% -10%, #1b2230 0%, var(--dl-bg) 60%);
  color:var(--dl-text); min-height:100vh; display:flex; align-items:center;
  justify-content:center; padding:32px 20px;
}
.dl-wrap { width:100%; max-width:460px; text-align:center; }
.dl-logo {
  width:72px; height:72px; margin:0 auto 22px; border-radius:18px;
  background:linear-gradient(135deg,#3b82f6,#1d4ed8);
  display:flex; align-items:center; justify-content:center;
  box-shadow:0 12px 40px rgba(59,130,246,.35);
}
.dl-logo svg { width:38px; height:38px; }
.dl-title { font-size:30px; font-weight:800; letter-spacing:-.02em; }
.dl-tagline { color:var(--dl-muted); font-size:16px; margin:10px 0 34px; line-height:1.5; }
.dl-badges { display:flex; flex-direction:column; gap:14px; }
.dl-badge {
  display:flex; align-items:center; gap:14px; background:#fff; color:#000;
  border-radius:14px; padding:14px 22px; text-decoration:none;
  border:1px solid rgba(0,0,0,.08);
  transition:transform .12s ease, box-shadow .12s ease, opacity .12s ease;
}
.dl-badge:hover { transform:translateY(-2px); box-shadow:0 10px 30px rgba(0,0,0,.35); }
.dl-badge svg { width:30px; height:30px; flex:0 0 auto; }
.dl-badge .dl-txt { text-align:left; line-height:1.1; }
.dl-badge .dl-small { display:block; font-size:11px; font-weight:500; color:#444; }
.dl-badge .dl-big { display:block; font-size:20px; font-weight:700; }
.dl-badge.dl-disabled { opacity:.5; cursor:not-allowed; pointer-events:none; }
.dl-note { margin-top:22px; font-size:13px; color:var(--dl-muted); line-height:1.5; }
`;

export default function DownloadPage() {
  return (
    <div className="dl-root">
      <style>{CSS}</style>
      <main className="dl-wrap">
        <div className="dl-logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2" />
            <circle cx="7" cy="17" r="2" />
            <path d="M9 17h6" />
            <circle cx="17" cy="17" r="2" />
          </svg>
        </div>

        <h1 className="dl-title">Fleet Hub</h1>
        <p className="dl-tagline">Fleet management, simplified.</p>

        <div className="dl-badges">
          <a className="dl-badge" href={ANDROID_APK_URL} rel="noopener">
            <svg viewBox="0 0 512 512" aria-hidden="true">
              <path fill="#00D7FE" d="M47 24c-6 3-10 10-10 19v426c0 9 4 16 10 19l248-232L47 24z" />
              <path fill="#00F076" d="M47 24l248 232 68-64L84 12C69 4 55 12 47 24z" />
              <path fill="#FFBC00" d="M363 192l-68 64 68 64 89-51c17-11 17-15 0-26l-89-51z" />
              <path fill="#FF3A44" d="M47 488c8 12 22 20 37 12l279-158-68-64L47 488z" />
            </svg>
            <span className="dl-txt">
              <span className="dl-small">GET IT ON</span>
              <span className="dl-big">Google Play</span>
            </span>
          </a>

          <a className="dl-badge dl-disabled" href="#" aria-disabled="true">
            <svg viewBox="0 0 384 512" aria-hidden="true">
              <path fill="#000" d="M318 272c-1-58 48-86 50-87-27-40-70-45-85-46-36-4-70 21-88 21s-46-20-76-20c-39 1-75 23-95 58-40 70-10 173 29 230 19 28 42 59 72 58 29-1 40-19 75-19s45 19 76 18c31 0 51-28 70-56 22-32 31-63 31-65-1-1-60-23-61-91z" />
              <path fill="#000" d="M259 61c16-19 27-46 24-73-23 1-51 15-67 34-15 17-28 45-24 71 25 2 51-13 67-32z" />
            </svg>
            <span className="dl-txt">
              <span className="dl-small">Download on the</span>
              <span className="dl-big">App Store</span>
            </span>
          </a>
        </div>

        <p className="dl-note">iOS is coming soon.</p>
      </main>
    </div>
  );
}

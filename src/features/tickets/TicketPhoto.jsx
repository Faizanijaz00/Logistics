// Renders a ticket's photo whether it was attached on web (picture_url) or on
// mobile (receipt_path in plan_for_contesting) — signing private-bucket paths
// as needed. So the admin sees every ticket's evidence regardless of source.
import { useState, useEffect } from 'react';
import { getReceiptUrl, resolveTicketPhoto } from '../../lib/receipts';

export function TicketPhoto({ ticket, size = 22 }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let alive = true;
    const { httpUrl, path } = resolveTicketPhoto(ticket);
    if (httpUrl) { setUrl(httpUrl); return; }
    if (path) {
      getReceiptUrl(path).then(u => { if (alive) setUrl(u); });
      return () => { alive = false; };
    }
    setUrl(null);
  }, [ticket]);

  if (!url) return <span style={{ color: '#c9cacb' }}>—</span>;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
      <img
        src={url}
        alt="Ticket evidence"
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: 4, border: '1px solid #e0e0e0' }}
      />
    </a>
  );
}

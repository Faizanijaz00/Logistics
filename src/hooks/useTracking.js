import { useEffect, useRef } from 'react';
import { trackingService } from '../services/trackingService';

export function useTracking(enabled = true) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (initialized.current) return;

    initialized.current = true;

    const wsUrl = import.meta.env.VITE_TRACKING_WS_URL
      || `ws://${window.location.hostname}:3001/ws`;

    trackingService.connect(wsUrl);

    return () => {
      trackingService.disconnect();
      initialized.current = false;
    };
  }, [enabled]);

  return {
    isConnected: trackingService.isConnected(),
  };
}

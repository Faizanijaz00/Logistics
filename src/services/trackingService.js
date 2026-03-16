import { useVehicleStore } from '../store';

class TrackingService {
  constructor() {
    this.ws = null;
    this.reconnectTimer = null;
    this.reconnectDelay = 2000;
    this.maxReconnectDelay = 30000;
    this.isConnecting = false;
    this.url = null;
  }

  connect(url) {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (this.isConnecting) return;

    this.url = url || `ws://${window.location.hostname}:3001/ws`;
    this.isConnecting = true;

    console.log('[Tracking] Connecting to', this.url);

    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      console.error('[Tracking] WebSocket error:', err);
      this.isConnecting = false;
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('[Tracking] Connected');
      this.isConnecting = false;
      this.reconnectDelay = 2000;
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (err) {
        console.error('[Tracking] Parse error:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('[Tracking] Disconnected');
      this.isConnecting = false;
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.isConnecting = false;
    };
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    console.log(`[Tracking] Reconnecting in ${this.reconnectDelay / 1000}s...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.connect(this.url);
    }, this.reconnectDelay);
  }

  handleMessage(message) {
    const { type, data } = message;
    const store = useVehicleStore.getState();

    if (type === 'position_update' || type === 'positions_snapshot') {
      for (const pos of data) {
        const vehicle = store.vehicles.find(
          v => v.trackerId && v.trackerId === pos.uniqueId
        );

        if (vehicle) {
          store.updateVehiclePosition(vehicle.id, {
            lat: pos.lat,
            lng: pos.lng,
            heading: pos.heading,
            speed: pos.speed,
            lastGpsUpdate: pos.timestamp,
          });
        }
      }
    }
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const trackingService = new TrackingService();

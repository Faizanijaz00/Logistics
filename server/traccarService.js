import { config } from './config.js';

class TraccarService {
  constructor() {
    this.baseUrl = config.traccar.url;
    this.authHeader = 'Basic ' + Buffer.from(
      `${config.traccar.username}:${config.traccar.password}`
    ).toString('base64');

    this.devices = [];
    this.lastPositions = new Map();
    this.listeners = new Set();
    this.pollTimer = null;
  }

  async fetch(path) {
    const response = await fetch(`${this.baseUrl}/api${path}`, {
      headers: {
        'Authorization': this.authHeader,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`Traccar API ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  async start() {
    console.log(`[Traccar] Connecting to ${this.baseUrl}`);
    try {
      await this.fetch('/server');
      console.log('[Traccar] Connected successfully');

      this.devices = await this.fetch('/devices');
      console.log(`[Traccar] Found ${this.devices.length} device(s)`);

      await this.pollPositions();
      this.pollTimer = setInterval(
        () => this.pollPositions(),
        config.traccar.pollIntervalMs
      );
    } catch (error) {
      console.error('[Traccar] Connection failed:', error.message);
      console.log('[Traccar] Retrying in 10s...');
      setTimeout(() => this.start(), 10000);
    }
  }

  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async pollPositions() {
    try {
      const positions = await this.fetch('/positions');
      const updates = [];

      for (const pos of positions) {
        const prev = this.lastPositions.get(pos.deviceId);

        const hasChanged = !prev
          || prev.latitude !== pos.latitude
          || prev.longitude !== pos.longitude
          || prev.speed !== pos.speed
          || prev.course !== pos.course;

        if (hasChanged) {
          this.lastPositions.set(pos.deviceId, pos);

          const device = this.devices.find(d => d.id === pos.deviceId);

          updates.push({
            deviceId: pos.deviceId,
            uniqueId: device?.uniqueId || null,
            deviceName: device?.name || null,
            lat: pos.latitude,
            lng: pos.longitude,
            speed: pos.speed,
            heading: pos.course,
            altitude: pos.altitude,
            accuracy: pos.accuracy,
            timestamp: pos.fixTime,
            attributes: pos.attributes || {},
          });
        }
      }

      if (updates.length > 0) {
        this.notifyListeners(updates);
      }
    } catch (error) {
      console.error('[Traccar] Poll error:', error.message);
    }
  }

  onPositionUpdate(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(updates) {
    for (const listener of this.listeners) {
      try {
        listener(updates);
      } catch (error) {
        console.error('[Traccar] Listener error:', error);
      }
    }
  }

  getDevices() {
    return this.devices;
  }

  getLastPositions() {
    return Array.from(this.lastPositions.values());
  }
}

export const traccarService = new TraccarService();

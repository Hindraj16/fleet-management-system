class TrackingWebSocket {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  /**
   * Connect to Django Channels WebSocket room
   * @param {string|number} vehicleId - ID of vehicle to listen to
   * @param {function} onMessageCallback - Triggered when a new GPS ping arrives
   * @param {function} onErrorCallback - Triggered on connection errors
   */
  connect(vehicleId, onMessageCallback, onErrorCallback) {
    const WS_BASE_URL =
      import.meta.env.VITE_WS_BASE_URL || "ws://127.0.0.1:8000/ws/tracking/";
    
    const wsUrl = `${WS_BASE_URL}${vehicleId}/`;

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log(`WebSocket connected to vehicle room: ${vehicleId}`);
      this.isConnected = true;
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessageCallback) {
          onMessageCallback(data);
        }
      } catch (err) {
        console.error("Failed to parse incoming WebSocket frame:", err);
      }
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket Error:", error);
      if (onErrorCallback) {
        onErrorCallback(error);
      }
    };

    this.socket.onclose = (event) => {
      console.log("WebSocket connection closed:", event.reason);
      this.isConnected = false;
    };
  }

  /**
   * Send data to server via WebSocket
   */
  send(data) {
    if (this.socket && this.isConnected) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.warn("Cannot send message, WebSocket is not connected.");
    }
  }

  /**
   * Close active WebSocket connection
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export const trackingWebSocket = new TrackingWebSocket();
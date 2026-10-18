class WebSocketService {
  constructor() {
    this.socket = null
    this.listeners = new Set()
    this.reconnectTimer = null
    this.shouldReconnect = true
    this.systemId = import.meta.env.VITE_SYSTEM_ID || "1"
    this.baseUrl = (import.meta.env.VITE_WEBSOCKET_URL || import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws").replace(/\/$/, "")
  }

  connect(systemId = this.systemId) {
    this.systemId = String(systemId)
    if (!this.shouldReconnect) return
    if (this.socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(this.socket.readyState)) return

    const socket = new WebSocket(`${this.baseUrl}/${encodeURIComponent(this.systemId)}`)
    this.socket = socket
    socket.onmessage = event => {
      try {
        const message = JSON.parse(event.data)
        this.listeners.forEach(listener => listener(message))
      } catch (error) {
        console.error("Invalid WebSocket message:", error)
      }
    }
    socket.onclose = () => {
      if (this.socket === socket) this.socket = null
      if (this.shouldReconnect && this.reconnectTimer == null) {
        this.reconnectTimer = window.setTimeout(() => {
          this.reconnectTimer = null
          this.connect(this.systemId)
        }, 2000)
      }
    }
  }

  disconnect() {
    this.shouldReconnect = false
    if (this.reconnectTimer != null) window.clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.socket?.close()
    this.socket = null
  }

  subscribe(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }
}

export const wsBroker = new WebSocketService()
wsBroker.connect()

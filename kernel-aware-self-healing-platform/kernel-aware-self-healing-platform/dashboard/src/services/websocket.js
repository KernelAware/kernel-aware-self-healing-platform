class WebSocketService {
  constructor() {
    this.socket = null
    this.listeners = new Set()
    this.systemId = 2
  }

  connect(systemId = 2) {
    this.systemId = systemId

    if (
      this.socket &&
      (
        this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING
      )
    ) {
      return
    }

    const url = `ws://localhost:8000/ws/${systemId}`
    this.socket = new WebSocket(url)

    this.socket.onopen = () => {
      console.log(`WebSocket connected to system ${systemId}`)
    }

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        this.listeners.forEach((listener) => {
          listener(message)
        })
      } catch (error) {
        console.error('Invalid WebSocket message:', error)
      }
    }

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    this.socket.onclose = () => {
      console.log(`WebSocket disconnected from system ${systemId}`)
      this.socket = null
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  subscribe(callback) {
    this.listeners.add(callback)

    return () => {
      this.listeners.delete(callback)
    }
  }

  send(message) {
    if (
      this.socket &&
      this.socket.readyState === WebSocket.OPEN
    ) {
      this.socket.send(JSON.stringify(message))
    }
  }
}

export const wsBroker = new WebSocketService()

wsBroker.connect(2)
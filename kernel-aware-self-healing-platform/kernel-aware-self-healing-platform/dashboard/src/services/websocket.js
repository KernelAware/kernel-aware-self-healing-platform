class MockWebSocket {
  constructor() {
    this.listeners = new Set()
    this.intervalId = null
  }

  connect() {
    if (this.intervalId) return
    this.intervalId = setInterval(() => {
      const metrics = {
        cpu: 20 + Math.round(Math.random() * 25),
        memory: 60 + Math.round(Math.random() * 10),
        diskIO: {
          read: 150 + Math.round(Math.random() * 100),
          write: 100 + Math.round(Math.random() * 80)
        },
        network: {
          rx: 35 + Math.round(Math.random() * 20),
          tx: 25 + Math.round(Math.random() * 15)
        },
        timestamp: new Date().toLocaleTimeString('en-GB')
      }
      this.broadcast({ type: 'metrics', data: metrics })
    }, 2000)
  }

  disconnect() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  subscribe(callback) {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  broadcast(message) {
    this.listeners.forEach((listener) => {
      try {
        listener(message)
      } catch (err) {
        console.error('Error broadcasting websocket event:', err)
      }
    })
  }
}

export const wsBroker = new MockWebSocket()
wsBroker.connect()

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io('http://localhost:3001', {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 2000,
    })
  }
  return socket
}

export function useSocket(outletId: string) {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const s = getSocket()
    socketRef.current = s
    s.emit('join-outlet', outletId)
    return () => { s.off() }
  }, [outletId])

  return socketRef.current
}

export function useKitchenSocket(outletId: string, onNewOrder: (data: any) => void) {
  useEffect(() => {
    const s = getSocket()
    s.emit('join-kitchen', outletId)
    s.on('order-received', onNewOrder)
    return () => { s.off('order-received', onNewOrder) }
  }, [outletId, onNewOrder])
}

export function emitNewOrder(outletId: string, orderData: any) {
  try {
    const s = getSocket()
    s.emit('new-order', { ...orderData, outletId })
  } catch { /* Socket not available — graceful degradation */ }
}

export function emitKotUpdate(outletId: string, kotId: string, status: string) {
  try {
    const s = getSocket()
    s.emit('kot-updated', { outletId, kotId, status })
  } catch { /* Socket not available */ }
}

export function emitTableUpdate(outletId: string, tableId: string, status: string) {
  try {
    const s = getSocket()
    s.emit('table-updated', { outletId, tableId, status })
  } catch { /* Socket not available */ }
}

const { createServer } = require('http')
const { Server } = require('socket.io')

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] }
})

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  // Join outlet room
  socket.on('join-outlet', (outletId) => {
    socket.join(`outlet:${outletId}`)
    console.log(`Socket ${socket.id} joined outlet:${outletId}`)
  })

  // Join kitchen room
  socket.on('join-kitchen', (outletId) => {
    socket.join(`kitchen:${outletId}`)
    console.log(`Socket ${socket.id} joined kitchen:${outletId}`)
  })

  // New order placed → notify kitchen
  socket.on('new-order', (data) => {
    console.log('New order:', data.orderNumber)
    io.to(`kitchen:${data.outletId}`).emit('order-received', data)
  })

  // KOT status updated → notify POS/waiters
  socket.on('kot-updated', (data) => {
    console.log('KOT updated:', data.kotId, data.status)
    io.to(`outlet:${data.outletId}`).emit('kot-status-changed', data)
  })

  // Table status changed
  socket.on('table-updated', (data) => {
    io.to(`outlet:${data.outletId}`).emit('table-status-changed', data)
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

const PORT = process.env.SOCKET_PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`)
})

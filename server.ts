import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3000;

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*", // Configure for production as needed
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join room signaling
    socket.on('join-room', (roomId: string) => {
      console.log(`User ${socket.id} joining room: ${roomId}`);
      socket.join(roomId);

      // Get list of existing users in the room (excluding this socket)
      const clients = io.sockets.adapter.rooms.get(roomId);
      const clientIds = clients ? Array.from(clients).filter(id => id !== socket.id) : [];

      // Send the list of existing users to the new user
      socket.emit('room-users', clientIds);

      // Notify other users in the room that a new user has joined
      socket.to(roomId).emit('peer-joined', socket.id);
    });

    // Relay SDP offers
    socket.on('offer', ({ targetId, offer }) => {
      console.log(`Relaying offer from ${socket.id} to ${targetId}`);
      io.to(targetId).emit('offer', {
        senderId: socket.id,
        offer
      });
    });

    // Relay SDP answers
    socket.on('answer', ({ targetId, answer }) => {
      console.log(`Relaying answer from ${socket.id} to ${targetId}`);
      io.to(targetId).emit('answer', {
        senderId: socket.id,
        answer
      });
    });

    // Relay ICE candidates
    socket.on('ice-candidate', ({ targetId, candidate }) => {
      console.log(`Relaying ICE candidate from ${socket.id} to ${targetId}`);
      io.to(targetId).emit('ice-candidate', {
        senderId: socket.id,
        candidate
      });
    });

    // Handle real-time chat messages
    socket.on('chat-message', ({ roomId, message }) => {
      console.log(`Chat message from ${socket.id} in room ${roomId}: ${message}`);
      io.to(roomId).emit('chat-message', {
        senderId: socket.id,
        message,
        timestamp: new Date().toISOString()
      });
    });

    // Handle user disconnecting
    socket.on('disconnecting', () => {
      console.log('User disconnecting:', socket.id);
      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.to(room).emit('peer-disconnected', socket.id);
        }
      });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});

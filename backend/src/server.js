const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Message } = require('./models/Message');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const mongodbUri = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());

// API health endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// REST API to get persistent room messages
app.get('/api/rooms/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;
  try {
    const messages = await Message.find({ roomId }).sort({ timestamp: 1 }).limit(100);
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching room messages:', error);
    res.status(500).json({ error: 'Failed to fetch room messages' });
  }
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join room signaling
  socket.on('join-room', (roomId) => {
    console.log(`User ${socket.id} joining room: ${roomId}`);
    socket.join(roomId);

    // Get list of existing users in the room
    const clients = io.sockets.adapter.rooms.get(roomId);
    const clientIds = clients ? Array.from(clients).filter(id => id !== socket.id) : [];

    // Send the list of existing users to the newcomer
    socket.emit('room-users', clientIds);

    // Notify other users in the room that a newcomer has joined
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

  // Handle and save real-time chat messages
  socket.on('chat-message', async ({ roomId, message }) => {
    console.log(`Chat message from ${socket.id} in room ${roomId}: ${message}`);
    try {
      // Save message persistently in MongoDB
      const dbMessage = new Message({
        roomId,
        senderId: socket.id,
        message
      });
      await dbMessage.save();

      // Broadcast saved message back to the entire room (including sender)
      io.to(roomId).emit('chat-message', {
        senderId: socket.id,
        message,
        timestamp: dbMessage.timestamp.toISOString()
      });
    } catch (error) {
      console.error('Failed to save chat message:', error);
    }
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

// Database connection & Server start
if (!mongodbUri) {
  console.error('MONGODB_URI env variable is missing!');
  process.exit(1);
}

mongoose.connect(mongodbUri)
  .then(() => {
    console.log('Successfully connected to MongoDB Atlas');
    httpServer.listen(port, () => {
      console.log(`> Backend server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB Atlas connection failure:', err);
    process.exit(1);
  });

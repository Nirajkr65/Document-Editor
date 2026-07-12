import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to CollabSpace API with WebSockets' });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);

// Socket.io Real-time Collaborators and Changes logic
const documentCollaborators = {}; // documentId -> [{ socketId, _id, name, email, profilePicture }]

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Handle joining a document room
  socket.on('join-document', ({ documentId, user }) => {
    socket.join(documentId);
    
    // Associate documentId and user with socket object
    socket.documentId = documentId;
    socket.user = user;

    if (!documentCollaborators[documentId]) {
      documentCollaborators[documentId] = [];
    }

    // Add user to room collaborators list
    if (!documentCollaborators[documentId].some((c) => c.socketId === socket.id)) {
      documentCollaborators[documentId].push({
        socketId: socket.id,
        _id: user?._id || '',
        name: user?.name || 'Anonymous',
        email: user?.email || '',
        profilePicture: user?.profilePicture || '',
      });
    }

    // Broadcast updated collaborators to the room
    io.to(documentId).emit('collaborators-changed', documentCollaborators[documentId]);
    console.log(`User ${user?.name} joined room ${documentId}`);
  });

  // Handle document edits transmission
  socket.on('send-changes', ({ documentId, title, content }) => {
    socket.to(documentId).emit('receive-changes', { title, content });
  });

  // Handle remote cursor movement
  socket.on('cursor-move', ({ documentId, range }) => {
    socket.to(documentId).emit('cursor-moved', {
      socketId: socket.id,
      range,
      user: socket.user,
    });
  });

  // Handle comment updates transmission
  socket.on('send-comment-update', ({ documentId }) => {
    socket.to(documentId).emit('receive-comment-update');
  });

  // Handle leaving a document room
  socket.on('leave-document', () => {
    const { documentId } = socket;
    if (documentId && documentCollaborators[documentId]) {
      documentCollaborators[documentId] = documentCollaborators[documentId].filter(
        (c) => c.socketId !== socket.id
      );
      io.to(documentId).emit('collaborators-changed', documentCollaborators[documentId]);
    }
    if (documentId) {
      socket.to(documentId).emit('collaborator-left', socket.id);
      socket.leave(documentId);
      console.log(`Socket ${socket.id} left room ${documentId}`);
    }
    socket.documentId = null;
    socket.user = null;
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const { documentId } = socket;
    if (documentId && documentCollaborators[documentId]) {
      documentCollaborators[documentId] = documentCollaborators[documentId].filter(
        (c) => c.socketId !== socket.id
      );
      io.to(documentId).emit('collaborators-changed', documentCollaborators[documentId]);
      socket.to(documentId).emit('collaborator-left', socket.id);
    }
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Port configuration
const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

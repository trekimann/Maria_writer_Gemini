import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import healthRoutes from './routes/health';
import projectRoutes from './routes/projects';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost',
    credentials: true,
  },
});

const PORT = process.env.PORT || 3000;

// Trust reverse proxy (Nginx, Unraid, etc.) so that express-rate-limit and
// other middleware can read X-Forwarded-For correctly.
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/projects', projectRoutes);

// WebSocket connection (Phase 4 - placeholder for now)
io.on('connection', (socket) => {
  logger.info(`WebSocket client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`WebSocket client disconnected: ${socket.id}`);
  });
});

// Error handling
app.use(errorHandler);

// Start server — skip in test environment (integration tests import `app` directly)
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
  });
}

export { app, io };

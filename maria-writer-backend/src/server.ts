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

// ---------------------------------------------------------------------------
// Startup environment validation — fail fast with a clear message if required
// vars are missing rather than crashing deep inside a request.
// ---------------------------------------------------------------------------
const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DATA_ENCRYPTION_KEY',
  'DATABASE_URL',
];

function validateEnv(): void {
  const missing: string[] = [];
  const present: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    const value = process.env[key];
    if (!value || value.trim() === '') {
      missing.push(key);
    } else {
      present.push(`${key}=<set, ${value.length} chars>`);
    }
  }

  // Always log what we found so it's visible in container logs
  for (const entry of present) {
    console.log(`[env-check] ✓ ${entry}`);
  }
  for (const key of missing) {
    console.error(`[env-check] ✗ MISSING: ${key}`);
  }

  if (missing.length > 0) {
    console.error(`[env-check] FATAL: ${missing.length} required environment variable(s) not set. Exiting.`);
    process.exit(1);
  }

  console.log('[env-check] All required environment variables are set.');
}

validateEnv();

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

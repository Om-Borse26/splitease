import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initializeDatabase } from './db/schema.js';
import { setupSockets } from './sockets/index.js';

// Routes
import authRoutes from './routes/auth.js';
import groupsRoutes from './routes/groups.js';
import expensesRoutes from './routes/expenses.js';
import usersRoutes from './routes/users.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Sentry Init
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

app.use(cors());
app.use(express.json());

// Initialize WebSockets
const io = new Server(httpServer, {
  cors: { origin: '*' }
});
setupSockets(io);

// Pass io to routes via middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/users', usersRoutes);

Sentry.setupExpressErrorHandler(app);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Internal Server Error' } });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await initializeDatabase();
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }
});

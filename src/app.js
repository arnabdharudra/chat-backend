const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const authRouter = require('./routes/auth');
const { setupSocket } = require('./socket');

function createServer(config) {
  const app = express();
  const corsOptions = { origin: config.allowedOrigins.length ? config.allowedOrigins : false };

  app.disable('x-powered-by');
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '10kb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRouter(config));

  const server = http.createServer(app);
  const io = new Server(server, { cors: corsOptions });
  setupSocket(io, config);

  return { app, server, io };
}

module.exports = { createServer };

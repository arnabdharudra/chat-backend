const jwt = require('jsonwebtoken');
const Message = require('./models/Message');

const HISTORY_SIZE = 50;

function setupSocket(io, config) {
  // Only logged-in users may connect: the client must send its JWT.
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('Not logged in'));
    try {
      socket.user = jwt.verify(token, config.jwtSecret);
      return next();
    } catch {
      return next(new Error('Session expired, please log in again'));
    }
  });

  io.on('connection', async (socket) => {
    const recent = await Message.find().sort({ createdAt: -1 }).limit(HISTORY_SIZE).lean();
    socket.emit('chat history', recent.reverse().map(toPublic));

    socket.on('chat message', async (text) => {
      if (typeof text !== 'string') return;
      const clean = text.trim().slice(0, 1000);
      if (!clean) return;
      try {
        const saved = await Message.create({ username: socket.user.username, text: clean });
        io.emit('chat message', toPublic(saved));
      } catch (err) {
        console.error('Failed to save message:', err.message);
      }
    });
  });
}

function toPublic(m) {
  return { username: m.username, text: m.text, createdAt: m.createdAt };
}

module.exports = { setupSocket };

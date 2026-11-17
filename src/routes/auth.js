const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');

function authRouter(config) {
  const router = express.Router();

  // Slow down password guessing: max 20 attempts per 15 minutes per IP.
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
  router.use(limiter);

  const issueToken = (user) =>
    jwt.sign({ id: user._id.toString(), username: user.username }, config.jwtSecret, { expiresIn: '1h' });

  router.post('/register', async (req, res) => {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    try {
      // The model hashes the password; do NOT hash it here too.
      const user = await User.create({ username, password });
      return res.status(201).json({ token: issueToken(user), username: user.username });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ error: 'That username is taken.' });
      if (err.name === 'ValidationError') {
        return res.status(400).json({ error: 'Username must be 3-30 letters, numbers or underscores.' });
      }
      console.error(err);
      return res.status(500).json({ error: 'Something went wrong.' });
    }
  });

  router.post('/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    try {
      const user = await User.findOne({ username });
      if (!user || !(await user.checkPassword(password))) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }
      return res.json({ token: issueToken(user), username: user.username });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Something went wrong.' });
    }
  });

  return router;
}

module.exports = authRouter;

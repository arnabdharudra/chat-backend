require('dotenv').config();

function loadConfig(overrides = {}) {
  const config = {
    port: Number(process.env.PORT) || 3000,
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    // Comma-separated list of websites allowed to connect, e.g. "https://myapp.com".
    // Leave empty to only allow the page served by this server itself.
    allowedOrigins: (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    ...overrides,
  };

  if (!config.jwtSecret || config.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long. See .env.example.');
  }
  if (!config.mongoUri) {
    throw new Error('MONGO_URI must be set. See .env.example.');
  }
  return config;
}

module.exports = { loadConfig };

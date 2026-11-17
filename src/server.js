const mongoose = require('mongoose');
const { loadConfig } = require('./config');
const { createServer } = require('./app');

async function main() {
  const config = loadConfig();
  await mongoose.connect(config.mongoUri);
  console.log('Database connected');

  const { server } = createServer(config);
  server.listen(config.port, () => console.log(`Chat server running on http://localhost:${config.port}`));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

import http from 'http';
import { app } from './app.js';
import { env } from './config/environment.js';
import { pool } from './config/database.js';

const server = http.createServer(app);

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await pool.end();
      console.log('PostgreSQL pool drained.');
      process.exit(0);
    } catch (err) {
      console.error('Error during pool termination:', err);
      process.exit(1);
    }
  });

  // Force exit after 10 seconds if hanging
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
server.listen(env.PORT, () => {
  console.log('================================================================');
  console.log(`Freelance Service Marketplace - Native Node.js Backend`);
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Server listening on: http://localhost:${env.PORT}`);
  console.log(`Health Check: http://localhost:${env.PORT}/health`);
  console.log(`API Base: http://localhost:${env.PORT}/api/v1`);
  console.log('================================================================');
});

import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/db';
import { env, getJwtSecret } from './config/env';

async function bootstrap() {
  try {
    console.log('[Server] Initializing Ladies-Wear Management System...');
    getJwtSecret();
    await connectDatabase();

    const app = createApp();

    const server = app.listen(env.PORT, () => {
      console.log(`[Server] API server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      console.log(`[Server] Health check available at http://localhost:${env.PORT}/api/health`);
    });

    const shutdown = async (signal: string) => {
      console.log(`[Server] Received ${signal}. Gracefully terminating...`);
      server.close(async () => {
        await disconnectDatabase();
        console.log('[Server] Shutdown complete.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('[Server] Fatal startup error:', error);
    process.exit(1);
  }
}

bootstrap();

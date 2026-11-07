/**
 * PayPulse Ingestion API & Edge Router
 * Server Entrypoint
 */

import { buildApp } from './app.js';

const start = async () => {
  const port = Number(process.env.PORT || 3001);
  const fastify = await buildApp({ logger: true });

  try {
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`PayPulse Ingestion API running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

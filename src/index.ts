import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { swaggerUI } from '@hono/swagger-ui';
import { logger } from 'hono/logger';
import aiRoutes from './routes/ai.routes.js';
import taskRoutes from './routes/task.routes.js';
import { HTTPException } from 'hono/http-exception';

import 'dotenv/config';

const app = new OpenAPIHono();

// Logger Middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(logger());
}

// CORS Middleware
app.use('*', cors({
  origin: '*', // Allow requests from any origin
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

// Basic root endpoint
app.get('/', (c) => {
  return c.redirect('https://xeocast.com');
});

// Mount API routes
// All routes under aiRoutes will be prefixed with /ai
// e.g., /ai/text
app.route('/ai', aiRoutes);
app.route('/tasks', taskRoutes);

// OpenAPI Specification Route
app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'XeoCast Heavy Compute API',
    description: 'API for heavy computation tasks.',
  },
  // You can add servers, security schemes, etc.
  // servers: [
  //   { url: 'http://localhost:3000', description: 'Development server' },
  // ],
});

// Swagger UI Route
app.get('/doc/ui', swaggerUI({ url: '/doc' }));

// Custom Error Handler
app.onError((err, c) => {
  console.error(`Unhandled error: ${err.message}`, err.stack);
  // Set CORS headers for error responses
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status as any);
  }
  // For other errors, return a generic 500 response
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;

// Run with Node.js (requires @hono/node-server):

import { serve } from '@hono/node-server';

if (process.env.NODE_ENV !== 'test') { // Avoid running server during tests
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  console.log(`Server is running on port ${port}`);
  console.log(`Swagger UI: http://localhost:${port}/doc/ui`);
  console.log(`OpenAPI Spec: http://localhost:${port}/doc`);

  serve({
    fetch: app.fetch,
    port: port,
  });
}

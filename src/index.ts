import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { swaggerUI } from '@hono/swagger-ui';
import geminiRoutes from './routes/geminiRoutes';
import { HTTPException } from 'hono/http-exception';

// If using Node.js and .env file for local development:
// import 'dotenv/config'; // Run: pnpm add dotenv

const app = new OpenAPIHono();

// CORS Middleware
app.use('*', cors({
  origin: '*', // Adjust to your frontend's origin in production
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Basic root endpoint
app.get('/', (c) => {
  return c.text('Xeocast Heavy Compute Service is running!');
});

// Mount API routes
// All routes under geminiRoutes will be prefixed with /api
// e.g., /api/gemini/generate-content
app.route('/api', geminiRoutes);

// OpenAPI Specification Route
app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Xeocast Heavy Compute API',
    description: 'API for heavy computation tasks, including Gemini integration.',
  },
  // You can add servers, security schemes, etc.
  // servers: [
  //   { url: 'http://localhost:3000', description: 'Development server' },
  // ],
});

// Swagger UI Route
app.get('/ui', swaggerUI({ url: '/doc' }));

// Custom Error Handler
app.onError((err, c) => {
  console.error(`Unhandled error: ${err.message}`, err.stack);
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status as any);
  }
  // For other errors, return a generic 500 response
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;

// To run with Node.js (requires @hono/node-server):
// 1. pnpm add @hono/node-server
// 2. Uncomment the following code:
/*
import { serve } from '@hono/node-server';

if (process.env.NODE_ENV !== 'test') { // Avoid running server during tests
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  console.log(`Server is running on port ${port}`);
  console.log(`Swagger UI: http://localhost:${port}/ui`);
  console.log(`OpenAPI Spec: http://localhost:${port}/doc`);

  serve({
    fetch: app.fetch,
    port: port,
  });
}
*/

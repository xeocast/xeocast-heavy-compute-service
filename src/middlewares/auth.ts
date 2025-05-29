import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

export const bearerAuth = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  // Prioritize c.env (e.g., Cloudflare Workers), fallback to process.env (Node.js)
  const EXPECTED_BEARER_TOKEN = c.env?.BEARER_TOKEN ?? process.env.BEARER_TOKEN;

  if (!EXPECTED_BEARER_TOKEN) {
    console.error('BEARER_TOKEN is not configured in the environment.');
    // Do not throw HTTPException here as it might expose internal config issues.
    // Let the request proceed to be caught by a general 500 error if this is critical,
    // or handle as a specific auth failure if token presence is strictly part of the auth logic.
    // For this case, we'll treat it as a misconfiguration leading to auth failure.
    throw new HTTPException(500, { message: 'Authentication mechanism not configured.' });
  }

  if (!authHeader) {
    throw new HTTPException(401, { message: 'Unauthorized: Missing Authorization header' });
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new HTTPException(401, { message: 'Unauthorized: Invalid token format. Expected Bearer token.' });
  }

  if (token !== EXPECTED_BEARER_TOKEN) {
    throw new HTTPException(403, { message: 'Forbidden: Invalid token' });
  }

  await next();
};

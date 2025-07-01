import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ContentfulStatusCode } from 'hono/utils/http-status';

export const cookieAuth = async (c: Context, next: Next) => {
  const primaryApiUrl = c.env?.PRIMARY_API_URL ?? process.env.PRIMARY_API_URL ?? 'https://dash-api.xeocast.com';
  const sessionEndpoint = `${primaryApiUrl}/auth/session`;

  const cookieHeader = c.req.header('Cookie');

  if (!cookieHeader) {
    throw new HTTPException(401, { message: 'Unauthorized: Missing Cookie header' });
  }

  try {
    const response = await fetch(sessionEndpoint, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
      },
    });

    if (!response.ok) {
      // If the session endpoint returns an error, propagate it
      const errorText = await response.text();
      throw new HTTPException(response.status as ContentfulStatusCode, { message: `Authentication failed: ${errorText}` });
    }

    // If the session is valid, proceed
    await next();
  } catch (error) {
    console.error('Error during session validation:', error);
    if (error instanceof HTTPException) {
      throw error; // Re-throw if it's already an HTTPException
    }
    throw new HTTPException(500, { message: 'Internal server error during authentication' });
  }
};

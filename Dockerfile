# Use an official Node.js runtime as a parent image
FROM node:22-alpine AS base

# Stage 1: Build the application
FROM base AS builder
# Install gcompat for compatibility with certain Node.js native modules
RUN apk add --no-cache gcompat
WORKDIR /app

# Copy package.json, pnpm-lock.yaml, and tsconfig.json
COPY package.json pnpm-lock.yaml tsconfig.json ./
# Copy source code
COPY src ./src/

# Install pnpm globally
RUN npm install -g pnpm

# Install dependencies using pnpm, build the project, and prune dev dependencies
RUN pnpm install --frozen-lockfile && \
    pnpm run build && \
    pnpm prune --prod

# Stage 2: Create the production image
FROM base AS runner
WORKDIR /app

# Create a non-root user and group
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

# Copy built application, production node_modules, and package.json from the builder stage
COPY --from=builder --chown=hono:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=hono:nodejs /app/dist ./dist
COPY --from=builder --chown=hono:nodejs /app/package.json ./package.json

# Switch to the non-root user
USER hono

# Expose the port the app runs on (default for Hono is often 3000)
# The start script is "node dist/index.js", check your src/index.ts for the actual port
EXPOSE 3000

# Define the command to run the application
CMD ["node", "./dist/index.js"]

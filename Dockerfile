FROM node:26.13.0-alpine3.24 as base
WORKDIR /app

# Stage 1: Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the SvelteKit application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Dummy build-time environment variables for SvelteKit validation
ENV BETTER_AUTH_SECRET=dummy_better_auth_secret_at_least_32_characters_long \
    DATABASE_URL=postgres://dummy:dummy@localhost:5432/dummy \
    ORIGIN=http://localhost:3000

# Build the application with the Node.js adapter
RUN npm run build

# Prune dev dependencies after build
RUN npm prune --omit=dev

# Stage 3: Production runtime
FROM base AS runner
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -S -g 1001 sveltekit && adduser -S -u 1001 -G sveltekit sveltekit

# Copy the built application
COPY --from=builder --chown=sveltekit:sveltekit /app/build ./build

# Copy production dependencies
COPY --from=builder --chown=sveltekit:sveltekit /app/node_modules ./node_modules

# Copy package.json for module resolution
COPY --chown=sveltekit:sveltekit package.json .

USER sveltekit

EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0

# Start the SvelteKit server
CMD ["node", "build/index.js"]

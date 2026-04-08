# ─── Stage 1: Dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Install production dependencies only
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production && \
    yarn cache clean

# ─── Stage 2: Builder ─────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install ALL dependencies (including devDependencies for build)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile && \
    yarn cache clean

# Copy source code
COPY . .

# Build the Remix app
ENV NODE_ENV=production
RUN yarn build

# ─── Stage 3: Runner (Distroless) ────────────────────────────────────
FROM gcr.io/distroless/nodejs20-debian12 AS runner

# Distroless has no shell, no package manager, no curl — minimal attack surface
# Default non-root user in distroless: UID 65534 (nobody)
USER 65534

WORKDIR /app

# Copy only production artifacts
COPY --from=deps --chown=65534:65534 /app/node_modules ./node_modules
COPY --from=builder --chown=65534:65534 /app/build ./build
COPY --from=builder --chown=65534:65534 /app/package.json ./package.json

# Hardcode production environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Remix serve entry point
CMD ["./node_modules/.bin/remix-serve", "./build/server/index.js"]

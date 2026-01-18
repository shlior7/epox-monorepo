# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# Enable corepack for yarn
RUN corepack enable

# Copy yarn configuration first
COPY .yarnrc.yml ./
COPY .yarn/releases ./.yarn/releases

# Copy package files
COPY package.json yarn.lock turbo.json ./
COPY packages/visualizer-types/package.json ./packages/visualizer-types/
COPY packages/visualizer-db/package.json ./packages/visualizer-db/
COPY packages/visualizer-services/package.json ./packages/visualizer-services/
COPY packages/visualizer-storage/package.json ./packages/visualizer-storage/
COPY packages/visualizer-ai/package.json ./packages/visualizer-ai/
COPY packages/scenergy-queue/package.json ./packages/scenergy-queue/
COPY packages/scenergy-monitoring/package.json ./packages/scenergy-monitoring/
COPY services/ai-worker/package.json ./services/ai-worker/

# Install dependencies (skip immutable check - lockfile still pins versions)
RUN yarn install

# Copy source
COPY tsconfig.json ./
COPY packages/visualizer-types ./packages/visualizer-types
COPY packages/visualizer-db ./packages/visualizer-db
COPY packages/visualizer-services ./packages/visualizer-services
COPY packages/visualizer-storage ./packages/visualizer-storage
COPY packages/visualizer-ai ./packages/visualizer-ai
COPY packages/scenergy-queue ./packages/scenergy-queue
COPY packages/scenergy-monitoring ./packages/scenergy-monitoring
COPY services/ai-worker ./services/ai-worker

# Production stage (using tsx to run TypeScript directly)
FROM node:22-alpine AS runner
WORKDIR /app

# Non-root user
RUN addgroup -g 1001 -S worker && adduser -u 1001 -S worker -G worker

# Copy everything from builder
COPY --from=builder --chown=worker:worker /app/node_modules ./node_modules
COPY --from=builder --chown=worker:worker /app/packages ./packages
COPY --from=builder --chown=worker:worker /app/services/ai-worker ./services/ai-worker
COPY --from=builder --chown=worker:worker /app/tsconfig.json ./

USER worker

ENV NODE_ENV=production PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["npx", "tsx", "services/ai-worker/src/index.ts"]

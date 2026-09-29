# Multi-stage Dockerfile para Next.js en Google Cloud Run
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"
ARG APP_VERSION=0.1.0
ARG GIT_COMMIT_SHA=unknown
ENV APP_VERSION=$APP_VERSION
ENV GIT_COMMIT_SHA=$GIT_COMMIT_SHA

RUN npm run build

FROM base AS runner
WORKDIR /app
ARG APP_VERSION=0.1.0
ARG GIT_COMMIT_SHA=unknown

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"
ENV APP_VERSION=$APP_VERSION
ENV GIT_COMMIT_SHA=$GIT_COMMIT_SHA

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]

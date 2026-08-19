# syntax=docker/dockerfile:1.6
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/inference-gateway/package.json ./services/inference-gateway/package.json
COPY services/inference-gateway/tsconfig.json ./services/inference-gateway/tsconfig.json
COPY services/inference-gateway/src ./services/inference-gateway/src
COPY tsconfig.base.json ./tsconfig.base.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
RUN pnpm --filter @adamjobs/inference-gateway run build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/services/inference-gateway/dist ./dist
COPY --from=builder /app/services/inference-gateway/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 8785
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]

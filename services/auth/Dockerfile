# syntax=docker/dockerfile:1.6
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/auth/package.json ./services/auth/package.json
COPY services/auth/tsconfig.json ./services/auth/tsconfig.json
COPY services/auth/src ./services/auth/src
COPY packages ./packages
COPY tsconfig.base.json ./tsconfig.base.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
RUN pnpm --filter @adamjobs/auth run build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/services/auth/dist ./dist
COPY --from=builder /app/services/auth/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 8782
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]

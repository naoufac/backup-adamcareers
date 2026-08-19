# syntax=docker/dockerfile:1.6
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/profiles/package.json ./services/profiles/package.json
COPY services/profiles/tsconfig.json ./services/profiles/tsconfig.json
COPY services/profiles/src ./services/profiles/src
COPY tsconfig.base.json ./tsconfig.base.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
RUN pnpm --filter @adamjobs/profiles run build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/services/profiles/dist ./dist
COPY --from=builder /app/services/profiles/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 8783
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]

# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --prod --filter @adamjobs/web...

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/web/tsconfig.json apps/web/tsconfig.json
COPY apps/web/next.config.mjs apps/web/next.config.mjs
COPY apps/web/postcss.config.mjs apps/web/postcss.config.mjs
COPY apps/web/tailwind.config.ts apps/web/tailwind.config.ts
COPY apps/web/next-env.d.ts apps/web/next-env.d.ts
COPY apps/web/src apps/web/src
RUN pnpm install --filter @adamjobs/web...
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN pnpm --filter @adamjobs/web build

# Standalone output mirrors the monorepo root (outputFileTracingRoot),
# so server.js lives at apps/web/server.js inside .next/standalone.
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8780
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
EXPOSE 8780
CMD ["node", "apps/web/server.js"]

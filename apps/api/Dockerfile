# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --prod --filter @adamjobs/api...

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/api/src apps/api/src
COPY apps/api/drizzle.config.ts apps/api/drizzle.config.ts
COPY apps/api/drizzle apps/api/drizzle
RUN pnpm install --filter @adamjobs/api...
RUN pnpm --filter @adamjobs/api build
# Install puppeteer chromium browser
RUN cd /app && npx puppeteer browsers install chrome --path /app/.puppeteer

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
# Install chromium runtime deps for puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont
# Tell puppeteer to use system chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY package.json pnpm-workspace.yaml ./
EXPOSE 8781
# Run migrations then start the server:
CMD ["sh", "-c", "cd apps/api && node dist/db/migrate.js && cd /app && node apps/api/dist/server.js"]

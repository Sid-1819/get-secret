FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/.npmrc ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/extension/package.json ./apps/extension/
COPY packages/sdk/package.json ./packages/sdk/

COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/prisma.config.ts ./apps/api/

RUN pnpm install --frozen-lockfile --filter @getsecret/api... --ignore-scripts \
    && pnpm --filter @getsecret/api exec prisma generate

COPY apps/api ./apps/api

RUN pnpm --filter @getsecret/api run build

FROM node:22-alpine AS production

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/.npmrc ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/extension/package.json ./apps/extension/
COPY packages/sdk/package.json ./packages/sdk/
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/prisma.config.ts ./apps/api/

COPY --from=builder /app/apps/api/dist ./apps/api/dist

RUN pnpm install --prod --frozen-lockfile --filter @getsecret/api... --ignore-scripts \
    && pnpm --filter @getsecret/api exec prisma generate

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["pnpm", "run", "start:prod"]

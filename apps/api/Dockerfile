FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* .npmrc ./

COPY prisma ./prisma
COPY prisma.config.ts ./

RUN pnpm install --frozen-lockfile --ignore-scripts \
    && pnpm exec prisma generate

COPY . .

RUN pnpm run build

FROM node:22-alpine AS production

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* .npmrc ./

COPY prisma ./prisma
COPY prisma.config.ts ./

COPY --from=builder /app/dist ./dist

# Prod deps include prisma CLI for migrate deploy; generate explicitly after install.
RUN pnpm install --prod --frozen-lockfile --ignore-scripts \
    && pnpm exec prisma generate

EXPOSE 3000

CMD ["pnpm", "run", "start:prod"]

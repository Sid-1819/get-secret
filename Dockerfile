FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./

COPY prisma ./prisma
COPY prisma.config.ts ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

FROM node:20-alpine AS production

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./

COPY prisma ./prisma
COPY prisma.config.ts ./

COPY --from=builder /app/dist ./dist

# Prod deps only; skip postinstall until prisma CLI is present (postinstall runs prisma generate).
RUN pnpm install --prod --frozen-lockfile --ignore-scripts \
    && pnpm add 'prisma@^7.2.0' --save-prod \
    && pnpm exec prisma generate

EXPOSE 3000

CMD ["pnpm", "run", "start:prod"]

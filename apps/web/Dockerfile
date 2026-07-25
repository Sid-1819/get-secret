FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.5.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

ARG VITE_API_URL=
ARG VITE_ENCATCH_PUBLISHABLE_KEY=
ARG VITE_ENCATCH_FORM_ID=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ENCATCH_PUBLISHABLE_KEY=$VITE_ENCATCH_PUBLISHABLE_KEY
ENV VITE_ENCATCH_FORM_ID=$VITE_ENCATCH_FORM_ID

RUN pnpm install --frozen-lockfile --ignore-scripts \
    && pnpm rebuild @swc/core esbuild sharp

COPY . .

RUN pnpm build

FROM alpine:3.20

COPY --from=builder /app/dist /app/dist

# Copies built assets into the shared volume mounted at /target.
CMD ["sh", "-c", "cp -r /app/dist/. /target/"]

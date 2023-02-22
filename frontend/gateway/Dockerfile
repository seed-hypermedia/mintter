# Build from the root with `docker build -t nextjs-docker . -f ./frontend/gateway/Dockerfile`.
FROM node:18-alpine AS base
RUN apk add git
RUN yarn global add pnpm
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY . .
RUN pnpm install --force --frozen-lock
ENV NEXT_TELEMETRY_DISABLED 1
RUN pnpm gw:build
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["pnpm", "gw:start"]
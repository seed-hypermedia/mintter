# Build from the root with `docker build -t nextjs-docker . -f ./frontend/gateway/Dockerfile`.
FROM node:18-alpine AS builder
RUN apk add git
RUN yarn global add pnpm
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY . .
RUN pnpm install --force --frozen-lock
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
RUN pnpm gw:build

FROM node:18-alpine AS production
COPY --from=builder app/frontend/gateway/.next/standalone .
COPY --from=builder app/frontend/gateway/.next/static ./frontend/gateway/.next/static
COPY --from=builder app/frontend/gateway/public ./frontend/gateway/public

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "frontend/gateway/server.js"]

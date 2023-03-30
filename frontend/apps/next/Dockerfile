# Build from the root with `docker build -t nextjs-docker . -f ./frontend/gateway/Dockerfile`.
FROM node:18-alpine AS builder
RUN apk add git
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY frontend .
RUN yarn install
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
RUN yarn web:prod

FROM node:18-alpine AS production
COPY --from=builder app/apps/next/.next/standalone .
COPY --from=builder app/apps/next/.next/static ./frontend/gateway/.next/static
COPY --from=builder app/apps/next/public ./apps/next/public

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "frontend/gateway/server.js"]

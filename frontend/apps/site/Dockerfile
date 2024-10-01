# Build from the root with `docker build -t nextjs-docker . -f ./frontend/apps/site/Dockerfile`.
# docker run -e HM_BASE_URL=http://127.0.0.1:56001 -e GRPC_HOST=http://127.0.0.1:56001 -it -p 3000:3000 --rm --name nextjs nextjs-docker:latest

FROM node:20-alpine AS builder

# ARG SENTRY_AUTH_TOKEN
RUN apk add git
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY . .
# RUN rm -rf ./frontend/apps/desktop
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
ENV NEXT_PUBLIC_LN_HOST https://ln.mintter.com
ENV GRPC_HOST http://minttersite:56001
ENV SENTRY_AUTH_TOKEN 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
ENV SITE_SENTRY_DSN https://47c66bd7a6d64db68a59c03f2337e475@o4504088793841664.ingest.sentry.io/4505527493328896
RUN yarn install 
RUN yarn site:prod


FROM node:20-alpine AS production
COPY --from=builder /app/frontend/apps/site/.next/standalone .
COPY --from=builder /app/frontend/apps/site/.next/static ./frontend/apps/site/.next/static
COPY --from=builder /app/frontend/apps/site/public ./frontend/apps/site/public

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN chmod -R 655 /frontend/apps/site/.next
USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "frontend/apps/site/server.js"]
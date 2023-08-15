# Build from the root with `docker build -t nextjs-docker . -f ./frontend/apps/site/Dockerfile`.
# docker run -e GW_NEXT_HOST=http://127.0.0.1:56001 -e NEXT_PUBLIC_GRPC_HOST=http://127.0.0.1:56001 -it -p 3000:3000 --rm --name nextjs nextjs-docker:latest

FROM node:18-alpine AS builder
RUN apk add git
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY . .
RUN yarn install 
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
ENV NEXT_PUBLIC_LN_HOST https://ln.mintter.com
RUN yarn site:prod


FROM node:18-alpine AS production
COPY --from=builder /app/frontend/apps/site/.next/standalone .
COPY --from=builder /app/frontend/apps/site/.next/static ./frontend/apps/site/.next/static
COPY --from=builder /app/frontend/apps/site/public ./frontend/apps/site/public

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "frontend/apps/site/server.js"]
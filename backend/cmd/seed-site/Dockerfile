# Build from the root with `docker build . -f ./backend/cmd/seed-site/Dockerfile`.
FROM golang:1.22.3-alpine AS builder
WORKDIR /code
ARG COMMIT_HASH
ARG BRANCH
ARG DATE
COPY go.mod go.sum ./
COPY third_party ./third_party
RUN go mod download
COPY backend ./backend
COPY monitoring ./monitoring
RUN apk add build-base
RUN go install -ldflags="-X 'seed/backend/daemon.commit=$COMMIT_HASH' -X 'seed/backend/daemon.branch=$BRANCH' -X 'seed/backend/daemon.date=$DATE'" ./backend/cmd/seed-site/

FROM alpine:latest
RUN apk add rsync
COPY --from=builder /go/bin/seed-site /usr/local/bin/seed-site
COPY --from=builder /code/monitoring/grafana /monitoring/grafana
COPY --from=builder /code/monitoring/prometheus /monitoring/prometheus
EXPOSE 55000 55001 55002
CMD ["/usr/local/bin/seed-site"]

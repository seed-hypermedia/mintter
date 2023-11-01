# Build from the root with `docker build . -f ./backend/cmd/mintter-site/Dockerfile`.
FROM golang:1.20.4-alpine AS builder
WORKDIR /code
ARG COMMIT_HASH
ARG BRANCH
ARG DATE
COPY go.mod go.sum ./
COPY third_party ./third_party
RUN go mod download
COPY backend ./backend
RUN apk add build-base
RUN go install -ldflags="-X 'mintter/backend/daemon.commit=$COMMIT_HASH' -X 'mintter/backend/daemon.branch=$BRANCH' -X 'mintter/backend/daemon.date=$DATE'" ./backend/cmd/mintter-site/

FROM alpine:latest
COPY --from=builder /go/bin/mintter-site /usr/local/bin/mintter-site
EXPOSE 55000 55001 55002
CMD ["/usr/local/bin/mintter-site"]

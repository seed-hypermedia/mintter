# Build from the root with `docker build . -f ./backend/cmd/mintter-site/Dockerfile`.
FROM golang:1.20.4-alpine AS builder
WORKDIR /code
ARG GIT_PATH=.git
COPY go.mod go.sum ./
COPY third_party ./third_party
COPY $GIT_PATH ./.git
RUN go mod download
COPY backend ./backend
RUN apk add build-base git
RUN go install ./backend/cmd/mintter-site/

FROM alpine:latest
COPY --from=builder /go/bin/mintter-site /usr/local/bin/mintter-site
EXPOSE 55000 55001 55002
CMD ["/usr/local/bin/mintter-site"]

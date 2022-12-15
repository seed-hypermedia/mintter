# Build from the root with `docker build . -f ./backend/cmd/gateway/Dockerfile`.
FROM golang:1.19-alpine AS builder
WORKDIR /code
COPY go.mod go.sum ./
COPY third_party ./third_party
RUN go mod download
COPY backend ./backend
RUN apk add build-base
RUN go install ./backend/cmd/gateway/

FROM alpine:latest
COPY --from=builder /go/bin/gateway /usr/local/bin/gateway
EXPOSE 55000 55001 55002
CMD ["/usr/local/bin/gateway"]

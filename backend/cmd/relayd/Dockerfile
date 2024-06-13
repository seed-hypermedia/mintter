# Build from the root with `docker build . -f ./backend/cmd/relayd/Dockerfile`.
FROM golang:1.22.3-alpine AS builder
WORKDIR /code
COPY go.mod go.sum ./
COPY third_party ./third_party
RUN go mod download
COPY backend ./backend
RUN go install ./backend/cmd/relayd/

FROM alpine:latest
COPY --from=builder /go/bin/relayd /usr/local/bin/relayd
EXPOSE 4002
CMD ["/usr/local/bin/relayd"]

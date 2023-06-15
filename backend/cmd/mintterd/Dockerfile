# Build from the root with `docker build -t mintterd . -f ./backend/cmd/mintterd/Dockerfile`.
FROM golang:1.20-alpine AS builder
WORKDIR /code
COPY go.mod go.sum ./
COPY third_party ./third_party
RUN go mod download
COPY backend ./backend
RUN apk add build-base
RUN go install ./backend/cmd/mintterd/

FROM alpine:latest
COPY --from=builder /go/bin/mintterd /usr/local/bin/mintterd
EXPOSE 55000 55001 55002
CMD ["/usr/local/bin/mintterd"]
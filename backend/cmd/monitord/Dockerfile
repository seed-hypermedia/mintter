# Build from the root with `docker build -t monitord . -f ./backend/cmd/monitord/Dockerfile`.
FROM golang:1.22.3-alpine AS builder
WORKDIR /code
COPY go.mod go.sum ./
COPY third_party ./third_party
RUN go mod download
COPY backend ./backend
RUN apk add build-base
RUN go install ./backend/cmd/monitord/

FROM alpine:latest
COPY --from=builder /go/bin/monitord /usr/local/bin/monitord
COPY --from=builder /code/backend/cmd/monitord/template.html /template.html
EXPOSE 5002
CMD ["/usr/local/bin/monitord"]

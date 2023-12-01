# Build from the root with `docker build -t mintterd . -f ./backend/cmd/mintterd/Dockerfile`.
FROM golang:1.20.4-alpine AS builder
WORKDIR /code
COPY go.mod go.sum ./
COPY third_party ./third_party
RUN go mod download
COPY backend ./backend
COPY monitoring ./monitoring
RUN apk add build-base
RUN go install ./backend/cmd/mintterd/

FROM alpine:latest
COPY --from=builder /go/bin/mintterd /usr/local/bin/mintterd
COPY --from=builder /code/monitoring/grafana /grafana
EXPOSE 55000 55001 55002
CMD ["/usr/local/bin/mintterd"]
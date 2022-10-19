# Build from the root with `docker build . -f ./backend/cmd/mintterd/Dockerfile`.
FROM golang:1.19-alpine AS builder
WORKDIR /code
COPY go.mod go.sum ./
COPY third_party ./third_party
RUN go mod download
COPY backend ./backend
RUN apk add g++ make
RUN go install ./backend/cmd/mintterd/

FROM alpine:latest
COPY --from=builder /go/bin/mintterd /usr/local/bin/mintterd
EXPOSE 50000 50001 50002
CMD ["/usr/local/bin/mintterd"]

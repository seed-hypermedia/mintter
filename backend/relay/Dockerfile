# docker build --rm -f "backend/relay/Dockerfile" -t mintter/libp2p-relay:latest "backend"
# docker push mintter/libp2p-relay:latest
FROM golang:1.18-alpine AS builder
WORKDIR /relay
RUN go mod init mintter
COPY ./cmd/relayd/conf.json.example ./conf/conf.json
COPY ./cmd/relayd/identity.example ./conf/relay.key
COPY ./cmd/relayd/*.go ./backend/cmd/relayd/
COPY ./relay/*.go ./backend/relay/
# This is ugly as hell but I cannot copy go.mod since it is outside
# of the docker scope. I cannnot build outside the scope since it
# conflicts with the current .dockerignore
RUN go get github.com/ipfs/go-log/v2
RUN go get github.com/libp2p/go-libp2p
RUN go get github.com/libp2p/go-libp2p-connmgr
RUN go get github.com/libp2p/go-libp2p-core/crypto
RUN go get github.com/libp2p/go-libp2p-core/host
RUN go get github.com/libp2p/go-libp2p-core/network
RUN go get github.com/libp2p/go-libp2p-core/peer
RUN go get github.com/libp2p/go-libp2p/p2p/protocol/circuitv1/relay
RUN go get github.com/libp2p/go-libp2p/p2p/protocol/circuitv2/relay
RUN go get github.com/multiformats/go-multiaddr
RUN go get github.com/multiformats/go-multiaddr/net
RUN go get go.uber.org/zap
RUN go get go.uber.org/zap/zapcore
RUN go mod tidy

RUN go build -o ./exe/relayd -ldflags="-s -w" ./backend/cmd/relayd

FROM alpine:latest
WORKDIR /relay
COPY --from=builder /relay/exe/relayd ./
COPY --from=builder /relay/conf/. ./conf/
EXPOSE 4002
CMD [ "/relay/relayd", "-config", "/relay/conf/conf.json", "-id","/relay/conf/relay.key" ]
package daemon

import (
	"context"
	"fmt"
	"net/http"
	"sync"

	"google.golang.org/grpc"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

var streams = struct {
	mu      sync.Mutex
	streams map[chan<- []byte]struct{}
}{
	streams: map[chan<- []byte]struct{}{},
}

// GRPCDebugLoggingInterceptor allows recording incoming gRPC requests for debugging and replaying.
func GRPCDebugLoggingInterceptor() grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (resp interface{}, err error) {
		err = func() error {
			streams.mu.Lock()
			defer streams.mu.Unlock()

			var data []byte
			for ch := range streams.streams {
				if data == nil {
					json, err := protojson.Marshal(req.(proto.Message))
					if err != nil {
						return fmt.Errorf("failed to intercept request: %w", err)
					}

					var pos int
					data = make([]byte, len(info.FullMethod)+1+len(json)+1)
					pos = copy(data, info.FullMethod)
					pos += copy(data[pos:], " ")
					pos += copy(data[pos:], json)
					copy(data[pos:], "\n")
				}

				ch <- data
			}
			return nil
		}()
		if err != nil {
			return nil, err
		}

		return handler(ctx, req)
	}
}

func grpcLogsHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "can't stream: doesn't support flush", http.StatusInternalServerError)
			return
		}

		ch := make(chan []byte, 5)
		streams.mu.Lock()
		streams.streams[ch] = struct{}{}
		streams.mu.Unlock()

		defer func() {
			streams.mu.Lock()
			delete(streams.streams, ch)
			streams.mu.Unlock()
		}()

		ctx := r.Context()

		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusAccepted)

		for {
			select {
			case <-ctx.Done():
				return
			case data := <-ch:
				_, _ = w.Write(data)
				flusher.Flush()
			}
		}
	})
}

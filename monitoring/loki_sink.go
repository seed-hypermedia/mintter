package monitoring

import (
	"bytes"
	"encoding/base64"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"go.uber.org/zap"
)

type lokiSink struct {
	httpClient *http.Client
	URL        string
	labels     map[string]string
}

// InitLokiSink init loki sink
func InitLokiSink(u *url.URL) (zap.Sink, error) {
	client := http.DefaultClient
	rt := WithHeader(client.Transport)
	rt.Set("Content-Type", "application/json")

	user := u.User.Username()
	pass, _ := u.User.Password()
	if user != "" && pass != "" {
		authorization := base64.StdEncoding.EncodeToString([]byte(user + ":" + pass))
		rt.Set("Authorization", "Basic "+authorization)
	}
	client.Transport = rt

	if u.Path == "" {
		u.Path = "api/prom/push"
	}

	sink := lokiSink{
		httpClient: client,
		URL:        strings.Replace(u.String(), "loki://", "https://", 1),
	}

	return sink, nil
}

// Close implement zap.Sink func Close
func (p lokiSink) Close() error {
	return nil
}

// Write implement zap.Sink func Write
func (p lokiSink) Write(b []byte) (n int, err error) {
	jsonStr, err := NewLokiDataStream(p.labels, b)
	if err != nil {
		return 0, err
	}

	req, err := http.NewRequest(http.MethodPost, p.URL, bytes.NewBuffer(jsonStr))
	if err != nil {
		return 0, err
	}

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return 0, nil
	}

	// TODO: panic is too much, what to do when status != 204?
	if resp.StatusCode != http.StatusNoContent {
		panic("Status code: " + strconv.Itoa(resp.StatusCode))
	}
	return len(b), nil
}

// Sync implement zap.Sink func Sync
func (p lokiSink) Sync() error {
	return nil
}

package monitoring

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

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

	sink := lokiSink{
		httpClient: client,
		URL:        strings.Replace(u.String(), "loki://", "https://", 1),
	}

	return sink, nil
}

type LokiEntry struct {
	TS   string `json:"ts"`
	Line string `json:"line"`
}

func NewLokiLabels(labels map[string]string) string {

	if labels == nil {
		return "null"
	}

	var buf strings.Builder

	buf.WriteString("{")
	for key, value := range labels {
		fmt.Fprintf(&buf, "%s=\"%s\",", key, value)
	}
	buf.WriteString("{")

	final := buf.String()
	final = final[:len(final)-1] + "}"
	return final
}

type LokiStream struct {
	Labels  string      `json:"labels"`
	Entries []LokiEntry `json:"entries"`
}

type LokiData struct {
	Streams []LokiStream `json:"streams"`
}

func NewLokiStream(labels map[string]string) LokiStream {
	stream := LokiStream{}
	stream.Labels = NewLokiLabels(labels)
	return stream
}

func (l *LokiData) AddStream(stream LokiStream) {
	l.Streams = append(l.Streams, stream)
}

func (s *LokiStream) AddEntry(line string) {
	entry := LokiEntry{
		TS:   time.Now().Format(time.RFC3339Nano),
		Line: string(line),
	}
	s.Entries = append(s.Entries, entry)
}

func NewLokiDataStream(labels map[string]string, line []byte) ([]byte, error) {
	hostname, _ := os.Hostname()
	env := "dev"

	stream := NewLokiStream(map[string]string{"app": "mintter", "hostname": hostname, "env": env})
	stream.AddEntry(string(line))
	jsonStr2 := LokiData{}
	jsonStr2.AddStream(stream)
	b, err := json.Marshal(jsonStr2)
	if err != nil {
		return nil, err
	}
	return b, nil
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
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		body, _ := ioutil.ReadAll(resp.Body)
		fmt.Fprintf(os.Stderr, "error sending logs to Loki: StatusCode: %d, Body: %s\n", resp.StatusCode, string(body))
	}
	return len(b), nil
}

// Sync implement zap.Sink func Sync
func (p lokiSink) Sync() error {
	return nil
}

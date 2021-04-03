package metrics

import (
	"encoding/json"
	"os"
	"time"
)

type LokiEntry struct {
	TS   string `json:"ts"`
	Line string `json:"line"`
}

func NewLokiLabels(labels map[string]string) string {

	if labels == nil {
		return "null"
	}

	final := "{"
	for key, value := range labels {
		final += key + "=\"" + value + "\","
	}
	final = final[:len(final)-1]
	final += "}"
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

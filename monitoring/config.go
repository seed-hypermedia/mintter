package monitoring

import (
	"net/url"

	"go.uber.org/zap"
)

const (
	LokiUser = "26305"
	LokiPass = "eyJrIjoiZjk5ODJkOWYwMGNjMGZiOTdiN2ZhZTMyMTY5ODQ0ZWViMTM2MzI1YyIsIm4iOiJ0ZXN0Mi1hZG1pbiIsImlkIjo0NzAxODZ9"
	LokiHost = "logs-prod-us-central1.grafana.net"
)

func init() {
	zap.RegisterSink("loki", InitLokiSink)
}

func GetLokiURL() url.URL {
	return url.URL{Scheme: "loki", Host: LokiHost, User: url.UserPassword(LokiUser, LokiPass)}
}

func GetLokiURLString() string {
	url := GetLokiURL()
	return url.String()
}

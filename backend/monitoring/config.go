package monitoring

import (
	"net/url"

	"go.uber.org/zap"
)

const (
	LokiUser = "26305"
	LokiPass = "eyJrIjoiZjk5ODJkOWYwMGNjMGZiOTdiN2ZhZTMyMTY5ODQ0ZWViMTM2MzI1YyIsIm4iOiJ0ZXN0Mi1hZG1pbiIsImlkIjo0NzAxODZ9"
	LokiHost = "logs-prod-us-central1.grafana.net"

	PrometheusUser = "54653"
	PrometheusPass = "eyJrIjoiMTU1MDc5ZWIwOTI3ODcyMGIyYWIyNWEzNzc1YTg3N2NjMDRlNTllMyIsIm4iOiJ0ZXN0MS1hZG1pbiIsImlkIjo0NzAxODZ9"
	PrometheusHost = "prometheus-us-central1.grafana.net"
)

func init() {
	zap.RegisterSink("loki", InitLokiSink)
}

func GetLokiURL() url.URL {
	return url.URL{Scheme: "loki", Host: LokiHost, User: url.UserPassword(LokiUser, LokiPass), Path: "api/prom/push"}
}

func GetLokiURLString() string {
	url := GetLokiURL()
	return url.String()
}

func GetPrometheusURL() string {
	url := url.URL{Scheme: "https", Host: PrometheusHost, User: url.UserPassword(PrometheusUser, PrometheusPass), Path: "api/prom/push"}
	return url.String()
}

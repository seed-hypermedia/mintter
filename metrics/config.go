package metrics

import (
	"go.uber.org/zap"
)

const (
	PROM_USER = "26305"
	PROM_PASS = "eyJrIjoiZjk5ODJkOWYwMGNjMGZiOTdiN2ZhZTMyMTY5ODQ0ZWViMTM2MzI1YyIsIm4iOiJ0ZXN0Mi1hZG1pbiIsImlkIjo0NzAxODZ9"
	PROM_HOST = "logs-prod-us-central1.grafana.net"
)

func init() {
	zap.RegisterSink("prometheus", InitPrometheusSink)
}

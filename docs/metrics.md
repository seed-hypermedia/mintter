# Monitoring

We use Grafana for monitoring both metrics and logs.

https://mintter.grafana.net

## Metrics

Metrics are exposed in Prometheus format and are available at `/metrics` (e.g. http://localhost:55001/metrics).

## Logs

Mintter outputs logs to the console, which are visible to the developers or captured by journald.

By default, logs are also sent to the Mintter Loki instance. Personal information is not sent, however
you can opt-out using the `-NoTelemetry` flag.

The logging package (`backend/logging`) takes inspiration from `ipfs/go-log`.

import http from 'node:http'
import os from 'node:os'
import * as prom from 'prom-client'

new prom.Gauge({
  name: 'process_num_cpus',
  help: 'Number of CPU cores available in the system.',
  collect() {
    this.set(os.cpus().length)
  },
})

prom.collectDefaultMetrics()

/**
 * Starts an HTTP server on the given port, configured to return Prometheus metrics.
 * The caller is responsible for closing the server when it's no longer needed.
 */
export function startMetricsServer(port: number): http.Server {
  const srv = http.createServer(async (req, res) => {
    switch (req.url) {
      case '/debug/metrics':
        res.writeHead(200, {'Content-Type': prom.register.contentType})
        res.end(await prom.register.metrics())
        return
      default:
        res.writeHead(404, {'Content-Type': 'text/plain'})
        res.end('Page not found')
        return
    }
  })

  srv.listen(port)

  return srv
}

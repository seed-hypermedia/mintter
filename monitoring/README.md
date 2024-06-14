## Local Monitoring

This is a simple local monitoring setup for the running Seed application.

It's currently WIP, and will change quite a bit.

The provisioned Grafana dashboards are copied from the upstream libp2p repository, applying changes to fix the dashboards for the newer version of Grafana.

## Getting Started

Make sure to have Docker available on your machine. For macOS you might want to use [Orb](https://orbstack.dev) instead of Docker Desktop.

The following commands assume you are inside the `monitoring` directory, but you can also run them from anywhere, providing `-f <path-to-compose-file>` flag to the `docker compose` commands.

1. Run `docker compose up -d`.
2. Open http://localhost:3001 in your browser. It might take a while before Grafana is ready to use.

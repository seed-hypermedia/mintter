# Mintter

Mintter is a decentralized knowledge collaboration application for open
communities powered by a knowledge graph.

You can read more about the product and why we are here on our website:
https://mintter.com.

## ⚠️ Stability

This is alpha-quality software. Have a copy of anything valuable you put into
Mintter.

We expect to make a breaking (incompatible) change to the data model in
following weeks.

## Building

You can build the project on Linux, macOS, and Windows. Although using Windows
for active development is probably going to be painful (unless using WSL).

The setup for Linux, and macOS is simplified using the
[Nix Package Manager](https://nixos.org/nix), and [Direnv](https://direnv.net).
The setup on Linux is a bit more involved due to dependencies on system
libraries that don't work well on non-NixOS Linux distros.

The bare minimum required for compilation is to have Rust, Go, and NodeJS
toolchains installed.

See the [developer setup](./docs/dev-setup.md) page for more info on how to
build the project.

## Docker

You can build docker images for different modules of the system. Always from the
repo root path you can issue the following commands:

daemon: `docker build -t mintterd . -f ./backend/cmd/mintterd/Dockerfile`

gateway: `docker build -t gateway . -f ./frontend/gateway/Dockerfile`

### Deploy a Site

One can also take advantage of the above modules and deploy a mintter site on a
public server (or locally for testing it out). You can customize the site easily
running the following command

```shell
sh <(curl -s https://raw.githubusercontent.com/mintterteam/mintter/master/site_deployment.sh)
```

All domains different than `http://127.0.0.1` are ssl terminated, so make sure
ports 80 and 443 are accessible from the outside. However if you want full
control over the deployment, there is a simple docker-compose file that should
bundle the necessary modules:

```shell
curl -s -o docker-compose.yml https://raw.githubusercontent.com/mintterteam/mintter/master/docker-compose.yml && docker compose up -d
```

This command will spin up the new site on http://127.0.0.1:3000. If you want to
customize the site and deployment, generate a `.env` file and place it in the
same folder as the `docker-compose.yml` file. Example `.env` file:

```yaml
MTT_SITE_HOSTNAME=https://example.com # Your domain. Remember to add the protocol [http(s)://] + url [yourdomain.com]
MTT_SITE_OWNER_ACCOUNT_ID=bahezrj4iaqacicabciqfnrov4niome6csw43r244roia35q6fiak75bmapk2zjudj3uffea # The mintter account ID of the owner of the site
MTT_SITE_WORKSPACE=~/.mtt-site # Directory where all the site data will be stored.
MTT_SITE_ADDITIONAL_FLAGS=-p2p.disable-listing # An optional series of flags to be passed to the site daemon. 
```
The list of flags than can be passed to the site daemon is:
```shell
-p2p.disable-listing
    Disable listing documents when requested (stealth mode)
-p2p.extra-addrs value
    Add extra addresses to listen on (comma separated)
-p2p.no-metrics
    Disable Prometheus metrics collection
-p2p.no-relay
    Disable libp2p circuit relay
-p2p.port int
    Port to listen for incoming P2P connections (default 55000)
-p2p.relay-backoff duration
    The time the autorelay waits to reconnect after failing to obtain a reservation with a candidate (default 3m0s)
-repo-path string
    Path to where to store node data (default "~/.mtt")
-site.hostname string
    Hostname of the site. If not provided then the daemon does not work as a site
-site.owner-id string
    Account ID of the owner of this site. If not provided, the owner ID will be this node's account ID
-site.title string
    Title of the site. Something brief and human readable to help understand the site
-site.token-expiration-delay duration
    The expiration time delay when creating a new invite token (default 168h0m0s)
-syncing.disable-inbound
    Not syncing inbound content via P2P, only syncs to remote peers. IF this is a site, however still admits content when published
-syncing.interval duration
    Periodic interval at which sync loop is triggered (default 1m0s)
-syncing.timeout-per-peer duration
    Maximum duration for syncing with a single peer (default 2m0s)
-syncing.warmup-duration duration
    Time to wait before the first sync loop iteration (default 1m0s)
```
### Update a site

If you want to update the site to the latest version, the easiest way is to
rerun the installation command to start a new site (ON)

```shell
sh <(curl -s https://raw.githubusercontent.com/mintterteam/mintter/master/site_deployment.sh)
```

Then set the same workspace path as the previous installation. The script should
recognize the previous installation and ask for overriding or continue. Chances
are that you want to keep the previous configuration, so just continue is fine
in most cases. If you want to change any param at this point, you can hit
override and change them. After applying the configuration, the site should have
been updated to latest version without any data loss and minimal downtime.

# Mintter

Mintter is a decentralized knowledge collaboration application for open
communities powered by a knowledge graph.

You can read more about the product and why we are here on our website:
https://mintter.com.

### Hypermedia Protocol

Mintter supports the new [Hypermedia Web Protocol](https://hyper.media/). This
open protocol supports secure identities, version control, semantic documents, multimedia,
and groups/organizations.

### Desktop App + Web Server

This repo includes:

1. Mintter Desktop - app for writing, reading, and saving Hypermedia content
2. Mintter Web Server - public web experience, a read-only portal of the Hypermedia network

## ⚠️ Stability

This is alpha-quality software. Have a copy of anything valuable you put into
Mintter.

## Dev Environment

See the [developer setup](./docs/docs/dev-setup.md) page for detailed instructions.

The dev environment on macOS+Linux uses the [Nix Package Manager](https://nixos.org/nix),
and [Direnv](https://direnv.net). The setup on Linux is a bit more involved due
to dependencies on system libraries that don't work well on non-NixOS Linux distros.

The bare minimum required for compilation is to have Go, and NodeJS toolchains
installed.

[./dev](./dev) is the main dev CLI. Run `./dev` to list commands, including:

- `./dev run-desktop`
- `./dev build-desktop`
- `./dev run-site`
- `./dev build-site`

## Web Build

You can build docker images for different modules of the system. Always from the
repo root path you can issue the following commands:

daemon: `docker build -t mintterd . -f ./backend/cmd/mintterd/Dockerfile`

gateway: `docker build -t gateway . -f ./frontend/gateway/Dockerfile`

### Deploy a Group Site

To deploy a group into a site, make sure you have a domain name <`hostname`> and
a server with at least 1GB RAM and 512MB free space in root partition. Run the
folloging command in the server:

```shell
sh <(curl -s https://raw.githubusercontent.com/mintterteam/mintter/master/website_deployment.sh) --hostname https://example.com
```

replacing `https://example.com` by your <`hostname`> If everything went well,
after some seconds, you should be watching a final output line like
`https://example.com/secret-invite/XXXX`. You should paste that link back into
the owner's application to register the newly created site and start publihing.
The site deployment workspace will default to `~/.mtt-site`.

### Update a Site

If you only want to update the site to the latest version, the easiest way is to
rerun the [installation command](#deploy-a-site) with the same hostname. Note
that if you change the hostname, a new secret invite will be generated to the
new site and old one can't be retrieved again.

So, if you want to update the hostname, we recomend to either backup the default site
workspace (`~/.mtt-site`) or generate the new site in a different workspace until
everything is checked to work properly:

```shell
sh <(curl -s https://raw.githubusercontent.com/mintterteam/mintter/master/website_deployment.sh) --workspace /home/root/new-path --hostname https://new-domain.com
```

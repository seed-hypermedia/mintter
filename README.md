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
- `./dev run-desktop-mainnet`
- `./dev build-desktop`
- `./dev run-site`
- `./dev build-site`

To run the dev build with the production network, use the following command:

```
MINTTER_P2P_TESTNET_NAME="" ./dev run-desktop
```

## Frontend Testing

```bash
yarn test               # test all the packages
yarn desktop:test       # test desktop app (e2e only now)
yarn site:test          # test only site code (WIP)
```

## Web Build

## Group sites

Group sites need two programs to run. The daemon which includes the P2P node (go app)
and the frontend that renders documents (nextjs app). However for a production
deployment everything is orchestrated by docker compose. Read next sections for how to
either deploy a site on a production server or run it locally in dev mode

### Deploy a Group Site

To deploy a group into a site, make sure you have a domain name and
a server with at least 1GB RAM and 512MB free space in root partition. Run the
following command in the server:

```shell
sh <(curl -sL https://go.hyper.media/website_deployment.sh) https://example.com
```

replacing `https://example.com` by your <`address`> If everything went well,
after some seconds, you should be watching a final output line like
`https://example.com/secret-invite/XXXX`. You should paste that link back into
the owner's application to register the newly created site and start publihing.
The site deployment workspace will default to `~/.mtt-site`.

#### Auto-Update a Site

If you want the site to auto update to latest stable images when they are pushed,
just execute the installation command with the `--auto-update` flag. Ex:

```shell
sh <(curl -sL https://go.hyper.media/website_deployment.sh) https://example.com --auto-update
```

#### Replace Site

If you want to replace an old site with a new site in a different domain in the same machine,
you need to redeploy the site from scratch. Note that old content will be available as long as 
the owner of the site is synced with the site at the moment of the replacement. On the server:

```shell
docker stop minttersite
mv ~/.mtt-site ~/.mtt-site.bak
docker start minttersite
```
Get the new secret link from the command line after starting the `minttersite` container
Now in the Mintter App, the Owner of the site can go to the group he/she wants to (re)deploy 
and click on the three dots, and publish group to site. Enter the new secret and the old content
should be now available in the new site. If there is no new content (A completely new group), then 
the site will be empty ready to accept documents
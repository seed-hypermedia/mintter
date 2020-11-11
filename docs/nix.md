## Install

**UPDATE 2020-11-11:** Nix has improved installations for Catalina since we
started using it. Check the official installation guide if you're running macOS
Catalina or older.

---

Nix is a really nice _cross-platform_ package manager. Think `brew` but
supporting multiple versions at the same time, and ability to create hermetic
and isolated environments for any software. It will not mess around with your
existing packages. It supports Linux and macOS.

So Nix is the only piece of software needed. It will install the rest of the
tools, and will make sure we all use the same versions. You don't need `node`,
`go` or anything else.

Install Nix by running `curl -L https://nixos.org/nix/install | sh`.

_IMPORTANT! If you are on macOS Catalina or above run `./scripts/setup-nix.sh`
first, and then install Nix._ This will create a virtual volume mounted at
`/nix`. This is needed because since Catalina you can't create arbitrary
directories in `/`, and Nix _really_ wants to use `/nix`.

## Hermetic Toolchains

There's some one-time setup required for all this to work.

Install direnv by running

```shell
nix-env -iA nixpkgs.direnv
```

Hook it into your shell (add one of the following lines to you `~/.profile`,
`~/.bashrc`, or `~/.zshrc`, depending on the shell you use).

```shell
eval "$(direnv hook bash)"  # for bash
eval "$(direnv hook zsh)"   # for zsh
eval (direnv hook fish)     # for fish
```

When inside the repository run

```shell
direnv allow .
```

This will ask `direnv` to setup the environment when you navigate to the
directory with the project.

So open up the directory with the project in a new terminal, and run `which go`
to test if it will find Go toolchain.

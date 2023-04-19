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

Install Nix following the [official instructions](https://nixos.org/download.html).

### IMPORTANT

- If you are on macOS Catalina or above you'll have to create a separate APFS volume that should be mounted at `/nix`.
The installer should guide you through the process. Don't be scared.
- Check if `$HOME/.nix-profile` exists. if not, you need to execute `nix-env -i nix`. This will install nix using Nix, and you need to do it because of some issues when installing new versions of the system. after this command finish executing, you should have this path available.
- Check your shell profile. The installer should've added a new line that would source Nix profile into your shell. If it doesn't happen, just add it yourself:

```
. $HOME/.nix-profile/etc/profile.d/nix.sh
```

### OPTIONAL

- Run `sudo mdutil -i off /nix` to disable Spotlight indexing. Recommended!
- Run `sudo SetFile -a V /nix && sudo killall Finder` to hide Nix disk volume from the Desktop.

## Hermetic Toolchains

There's a one-time setup required for all this to work.

Install direnv by running

```shell
nix-env -iA nixpkgs.direnv
```

Add direnv hook to your shell profile:

```shell
eval "$(direnv hook bash)"  # for bash
eval "$(direnv hook zsh)"   # for zsh
eval (direnv hook fish)     # for fish
```

Then `cd` to the repository and run:

```shell
direnv allow .
```

This will ask `direnv` to setup the environment when you navigate to the
directory with the project.

So open up the directory with the project in a new terminal, and run `which go`
to test if it will find Go toolchain.

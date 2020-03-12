# This Dockerfile builds builds all the tools needed for hacking on this repository.
# We might eventually want to use it in our CI.

FROM nixos/nix:latest
WORKDIR /usr/src
RUN nix-env -i git
COPY . .
RUN nix-env -f shell.nix -i -A buildInputs
RUN rm -rf /usr/src/*
RUN nix-store --gc --print-dead
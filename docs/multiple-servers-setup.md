# Running Multiple Mintter Setups Locally

In development, you might need to run two separate instance of a mintter node locally for testing purposes, here's a basic setup for how to do so.

## What you will endup getting

- a mintter server (`server1`) running on port `55001` + the grpc port pointing to `55002`
- a mintter frontend app pointing to `server1` running on port `3000`
- another mintter server (`server2`) running on port `56001` + the grpc port pointing to `56002`
- another mintter frontend app pointing to `server2` running on port `4000`

## Setup

you need to open 4 terminal windows with `direnv` loaded properly

- Terminal 1: Server 1 => `./dev run-backend --repo-path=./_s1`
- Terminal 2: Frontend 2 => `yarn app dev`
- Terminal 3: Server 2 => `./dev run-backend --repo-path=./_s2 --http-port="56001" --grpc-port="56002"`
- Terminal 4: Frontend 2 => `yarn app dev2` (this command is changing the backend env variable to `56002`. you can checkout the script [here](../frontend/app/package.json) in the `scripts` object)

## Things to consider

- you can repeat this process to create as much backends as you want. just make sure that your machine can support and have the resources needed.
- the ports `56001`, `56002` and `4000` for the second app does not need to be those, you can change them to whatever you prefer. Just make sure to modify the `dev2` script to point to the new backend port
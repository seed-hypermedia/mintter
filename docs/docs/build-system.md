NOTE: this is a living document (well, as any other) and might not provide the complete information. Please, ask questions and let us know if this can be improved.

## Better Build Systems 101

Most build systems suck. Those that are good are normally specific to a single programming language, ecosystem, or platform.

[Bazel](https://bazel.build) is nice, but it gets in the way of the well-established tools and ecosystems, and requires a big "buy in" from the team to use it properly. Although the benefit can be substantial, the burden is often unbearable, unless the monorepo is really so huge that benefits outweigh the burden. Ours is pretty small, but it has quite a few moving parts: Electron desktop app, NextJS site, Go daemon for the desktop app, Go daemon for the site server, a bunch of extra supporting tools, code generation tools, etc. A sensible build system could help a lot with orchestrating all of this, ideally without doing stupid things like building the same stuff that's already built.

We tried to "bend" Bazel to make it more pragmatic, and had some success. Although some issues were discovered during the process, and later we realized that [Please](https://please.build) is very similar to Bazel, but allows for more flexibility and is less strict in many aspects.

Both Bazel and Please share some fundamental ideas:

1. They use a proper scripting language (although it's free of side-effects) for the build configuration (subset of Python). While build rule definition is still declarative, having the limited power of a scripting language allows for a lot of things not possible with YAML or other "declarative" ways of configuring the build.

2. Build targets can be fine grained or coarse grained. You can decouple things easily by placing BUILD files wherever they fit better.

3. They strive for being deterministic. Same inputs should produce same outputs.

4. They are based on a graph data model. You can express dependencies between targets in a very convenient way. And you can limit the "visibility" between targets. This graph is also available for you to query and build tools on top of it. E.g. build only those targets that are affected by changes in a particular commit.

5. They use hashing to avoid building things that were already built and didn't change.

6. They are language-agnostic.

7. They almost never need you to run some kind of `clean` process.

8. Build results are separate from the source tree. The build process is sandbox and can only see declared inputs, so you can't miss a dependency.

After spending a few years with Please we realized that it has one fundamental problem for us – it doesn't work natively on Windows. Initially we thought we'd only want to target Windows machines, not necessarily develop on Windows. Turned out that cross-compilation is such a mess that you actually do want to be able to develop on the platform you are targeting. That's one of the reason why we don't use our development setup in CI (although one of the main points of our dev setup was to be able to reuse it in CI, not only across developers): we build *for* Windows *on* Windows, so we have to do everything manually, without relying on the scripts we have for local development.

We want to have a superb DX on all the platforms, such that you only need to install one or two tools, run a single command to build/test everything, never have to rebuild things twice, or wait long minutes until your build finishes. We want that on Windows too. So at some point we'll probably switch from Please to Bazel or Buck2 for building, and switch from Nix to Pixi for managing our tools. But refactoring the build system didn't become important enough yet, compared to other things we're trying to build at this time.

## Seed Specifics

All the devs at Seed use macOS or Linux for development, so most of the scripts, tools, and conveniences only work these. We want to improve the DX on Windows, but we can't invest the time in that just yet.

We do build *for* Windows *on* Windows in CI though, so building everything on Windows is entirely possible, just not as convenient as on Unix-based systems.

### Dev CLI

Most common developer tasks are provided in the Dev CLI which you can run with `./dev` from the workspace root. It started as a shell script, but ended up being a Python script to provide better support for help messages, subcommands and flags. For normal day-to-day work you should get around with just using this CLI. Run it with no arguments to see the help message.

### Code Generation

We generate some amount of code here, mostly for Go and JavaScript, based on the Protobuf definitions, GraphQL schema, SQLite queries and tables, etc. We keep the generated code in the repo for convenience, better IDE integration, and ability to review the generated code.

We has to implement some tricks to efficiently generate code, because our build system actually prefers to generate code at build time. If you change some file that is a source for code generation (like a Protobuf file) make sure to run `./dev gen` before committing or building: it will check if the generated code is up to date, and run the code generators if necessary.

If you create new files for code generationg, look around `BUILD.plz` files inside `proto`, `backend`, and `graphql` directories for some examples.

You can list code generation targets with `plz query filter -i 'generated:gen'`.

### How to Build on Windows

As mentioned, we mostly use macOS and Linux for development, so developing on Windows is currently not very convenient. We want to make it better.

The idea is to install everything manually, and manually run all the commands that might be necessary. This is exactly what we do in CI (we don't use our dev tools these yet), so the tips here are applicable to any system where you can't or don't want to use our dev scripts.

On Windows you should probably install MSYS2, the latest PowerShell, Chocolatey (or Scoop) for package management, and use an administrator account.

The absolute minimum of tools you must have to build our desktop app (use the same version as defined in CI):

1. Go toolchain.
2. NodeJS toolchain.
3. Yarn.
4. Probably some of the environment variables defined in `.envrc` file.

Take a look around `.github/workflows` directory (especially `.github/workflows/desktop-release.yml`) to see how we build our app in CI. Try to replicate the exact version of the tools locally.

To build the desktop app:

1. Create a directory `plz-out/bin/backend` which is where Electron build system expects the `seed-daemon` binary to be.
2. Build `seed-daemon` with `go build -o plz-out/bin/backend/seed-daemon-<llvm-platform-triple> ./backend/cmd/seed-daemon`.
    - Make sure `CGO_ENABLED=1` env variable is set.
    - The `llvm-platform-triple` depends on the platform you're on. See the values we use in CI here: https://github.com/MintterHypermedia/mintter/blob/d7582fed90840eae953a191b779ef5285b9c21b1/.github/workflows/desktop-release.yml#L63-L79.
    - On Windows add `.exe` to the output path.
3. Run `yarn install`.
4. Run `yarn desktop` to start the Electron's dev workflow.

NOTE: this is a living document (well, as any other) and might not provide the complete information. Please, do ask questions and let us know if this can be improved.

## Better Build Systems (Arguably)

Most build systems suck. [Bazel](https://bazel.build) is great, but it gets in the way of well-established tools and ecosystems. It requires a lot of "buy in" from the team to use it properly. Although the benefit can be substantial, the burden is often unbearable, unless the monorepo is really huge. Ours is pretty small, although has quite a few moving parts: the web app, the Go backend, the desktop app, a bunch of extra supporting tools, etc. A sane build system could help a lot with orchestrating all of this. Ideally without doing stupid things like building the same stuff that's already built.

We tried to "bend" Bazel to make it more pragmatic, with some success. Although some issues were discovered during the process, and later on we realized that [Please](https://please.build) is very similar to Bazel, but allows for more flexibility and is less strict in many aspects.

Some good things about these build systems are (among others):

1. They use a proper scripting language for build configuration (subset of Python). While rule declaration is still declarative, having the limited power of a scripting language allows for a lot of things not possible with YAML or other "declarative" ways of configuring the build.

2. Build targets can be fine grained or coarse grained. You can decouple things easily by placing BUILD files wherever they suit better.

3. They strive for being deterministic. Same inputs should produce same outputs.

4. They are based on a graph data model. You can express dependencies between targets in a very convenient way. And you can limit the "visibility" between targets. This graph is also available for you to query and build tools on top of it. E.g. only running targets that are affected by changes in a particular commit.

5. They use hashing to avoid building stuff that's already built and inputs haven't changed.

6. They are language-agnostic.

7. They almost never need you to run some kind of `clean` process.

8. Build results are out of the source tree. The build process as well. You should only have access to the inputs you specify, so you can't miss a dependency.

## Mintter Specifics

### Dev CLI

Most common developer tasks are abstracted away in the Dev CLI which you can run with `./dev` from the workspace root. It started as a shell script, but ended up being a Python script to provide better support for help messages, subcommands and flags. For normal day-to-day work you should get around with just using this CLI. Run it with no argument to see the help message.

### Code Generation

We generate some amount of code here, mostly for Go and JavaScript. Based on the Protobuf definitions, GraphQL schema, SQLite queries and tables, etc. Unfortunately the build system assumes that the code is generated at build time and is not in the source tree, but this often goes against the best practices of the programming languages. For example in Go it's common to check the generated code in. It also provides the nice benefits of being able to review the generated code in a PR, and so on.

So we've implemented some tricks to efficiently generate code, using the build system and also working around its limitations. If you change some source of code generation (like a Protobuf file) just make sure to run `./dev gen` before building. It will check if generated code is up to date, and run the code generators if needed.

If you need to generate more code, look around `BUILD.plz` files inside `/proto`, `/backend`, and `/graphql` directories for some examples.

You can list code generation targets with `plz query filter -i 'generated:gen'`.

### Components

Our build targets are pretty coarse-grained and separated by "components": the `mintterd` daemon, the frontend webapp, and so on. This is quite uncommon for build systems like Please and Bazel, but with implementing some tricks it allows us to take advantage of the existing well-established patterns and tools for each ecosystem we're using.

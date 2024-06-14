# Frontend Development Setup
- [Frontend Development Setup](#frontend-development-setup)
  - [TLDR;](#tldr)
  - [Introduction](#introduction)
  - [Prerequisites](#prerequisites)
  - [./dev scripts](#dev-scripts)
  - [Desktop app](#desktop-app)
    - [Run the desktop app locally](#run-the-desktop-app-locally)
    - [Build the desktop app locally](#build-the-desktop-app-locally)
  - [Sites](#sites)
    - [Run the Site app locally](#run-the-site-app-locally)
    - [Build sites locally](#build-sites-locally)
  - [Scoped package](#scoped-package)
  - [Monorepo Architecrure](#monorepo-architecrure)
    - [Inspirations and Special mentions](#inspirations-and-special-mentions)

## TLDR;

⚠️ make sure you [setup the project tools](./dev-setup.md) ⚠️

```bash
git clone <repo>

cd mintter
yarn install

# desktop app: for local development
./dev run-desktop

# desktop app: to build locally
./dev build-desktop

# site: for local development: TBD
# site: for local build: TBD

# validate frontend code
./dev frontend-validate

# test frontend code
./dev frontend-test
```

## Introduction

The Seed Frontend architecture is based on a [yarn](https://yarnpkg.com) workspace. All the frontend code can be found inside the [`./frontend`](../../frontend) folder. The app is using a monorepo structure inspired by the [Create Tamagui App template](https://tamagui.dev/docs/guides/create-tamagui-app).

- all the apps packages are inside the [`apps`](../../frontend/apps) folder.
- all the scoped packages that are reused inside each app are in the [`packages`](../../frontend/packages) folder.
- we are not required to build individual packages before building the apps. The apps are the ones in charge of building all the necesary codebase and pull the packages code from source (using [tsconfig paths](https://www.typescriptlang.org/tsconfig#paths)) We explained this in more detail in [#monorepo-architecture]

Now let's describe each package and what it does

1. [`apps/desktop`](../../frontend/packages/app): The Local-first Desktop app built with [Electron](https://electronjs.com)
1. [`apps/site`](../../frontend/packages/app): The Self-hosted sites anyone can run on their own servers built using [NextJS](https://nextjs.org)
1. [`packages/app`](../../frontend/packages/app): All the "screens" for the local-first apps (currently only `desktop`, soon others...)
1. [`packages/ui`](../../frontend/packages/ui): All the individual UI components and the theme setup for all the apps.
1. [`packages/shared`](../../frontend/packages/shared): All the code that interface with the local backend API and gRPC.
1. [`packages/eslint-config-custom`](../../frontend/packages/eslint-config-custom): the base eslint config for all the frontend code
1. [`packages/prettier-config`](../../frontend/packages/prettier-config): the base formatting config for all the frontend code.


After you [setup the project](./dev-setup) on your local machine, you should have `yarn` available, so no need to install it globally.

## Prerequisites

Please make sure that after you enter the repo root path, you see something similar to this showing the necessary Environment variables set:

[![dev setup showcase](https://img.youtube.com/vi/l5smHCf1AYA/0.jpg)](https://www.youtube.com/watch?v=l5smHCf1AYA)

After this is correct, you should run `yarn install` (or `yarn`) to start the dev setup. [Nix](./nix.md) is helping us installing all the necessary tools and setup we need to run every script and app inside the repo. Don't worry of having the exact version of yarn or any other tool, Nix got us covered!

## ./dev scripts

Because Seed uses multiple tools with multiple languages, we set a file with all the local scripts you can run to setup, build, validate and test the project.

## Desktop app

The desktop app is the main Application that users can have to interact and collaborate inside the Hyperdocs Protocol. Everything works locally and there's no need to servers or Internet connection.

This application is built with this main tools and frameworks:

- Electron (with electron-forge)
- Vite
- Tamagui
- React
- BlockNote (build with TipTap and Prosemirror)
- Radix UI
- Unified
- TRPC

### Run the desktop app locally

because we are using [Nix](./nix), we are able to create custom orchestrated commands in order to setup everything properly for any situation. To run the desktop app locally, you just need to run:

```bash
./dev run-desktop
```

This command should trigger a set of processes that eventually should launch the app in dev mode

[![Running the desktop app locally](https://img.youtube.com/vi/EQDLgjfgp90/0.jpg)](https://www.youtube.com/watch?v=EQDLgjfgp90)

Keep in mind that `./dev run-desktop` runs both the desktop app **and the go backend**. This is setup this way for convenience and ease of use.

### Build the desktop app locally

To build the desktop app locally you can simply run the next command:

```bash
./dev build-desktop
```

This will build the Application based on the platform you are currently running. We support MacOS, Linux and Windows.

If you have any issues running the application or building the application locally, please [file an issue](https://github.com/mintterteam/mintter/issues/new/choose) with the platform you are running on and we will address it as fast as we can.

## Sites

TBD
### Run the Site app locally

TBD (we need to finish the groups setup to see how will be)
### Build sites locally

TBD (we need to finish the groups setup to see how will be)

## Scoped package

All the packages inside the [`packages` folder](../../frontend/packages) are used as source code inside both apps. There's no need to build them separately.

This is possible in our case because we are not intended to publish this packages separate from the app. For us, there's no need to setup all the madness needed in order for publish individual packages and develop with then locally in a sensible way. Mayb ein the future, who knows!

## Monorepo Architecrure

Like I mentioned before, this monorepo does not follow some conventions other monorepos might do. This are the essential requirements we need at the moment that this setup fulfills:

- we want to separate the code into its own scope
- we use Typescript
- we don't need to build individual packages, only the apps
- we want to import files using the package name, but import from the source (the actual package)

To achieve this, based on the code structure we adopted thanks to [Tamagui](https://tamagui.dev), we are mainly using [TSConfig paths](https://www.typescriptlang.org/tsconfig#paths) to make sure typescript understands from where it needs to pull the package's code.

```json
// ./frontend/apps/desktop/tsconfig.json
{
  "compilerOptions": {
    // ...
    "baseUrl": ".",
    "paths": {
      "*": ["*"],
      "@mintter/ui": ["*", "../../packages/ui/src/index.tsx"],
      "@mintter/shared": ["*", "../../packages/shared/src/index.ts"],
      "@mintter/app/*": ["*", "../../packages/app/src/*"],
      "react-native": ["react-native-web"]
    }
  },
  // ...
}
```

Another change that we did is that in each scoped package's `package.json` file, we are not setting anything related to exports nor types. WE found that doing this makes it simple for `tsc` compiler to find the correct files based on the paths set.

You can also see that on each scoped package there's only 2 or 3 scripts set: `lint`, `format` and `test`. While we don't want to build this packages individually, we do want to make sure the code structure and linting follows the project's rules.

### Inspirations and Special mentions

We took a lot of inspirations from tools like [Tamagui](https://tamagui.dev), [Turbo](https://turbo.build/repo) and tutorials like [Monorepo Maestros](https://www.shew.dev/monorepos).


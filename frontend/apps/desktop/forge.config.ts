import {MakerDeb, MakerDebConfig} from '@electron-forge/maker-deb'
import {MakerRpm} from '@electron-forge/maker-rpm'
import {MakerSquirrel} from '@electron-forge/maker-squirrel'
import {MakerZIP} from '@electron-forge/maker-zip'
import type {ForgeConfig} from '@electron-forge/shared-types'
// import {MakerRpm} from '@electron-forge/maker-rpm'
import {VitePlugin} from '@electron-forge/plugin-vite'
import path from 'node:path'
import packageJson from './package.json'
// import setLanguages from 'electron-packager-languages'

const {version} = packageJson

const devProjectRoot = path.join(process.cwd(), '../../..')
const LLVM_TRIPLES = {
  'darwin/x64': 'x86_64-apple-darwin',
  'darwin/arm64': 'aarch64-apple-darwin',
  'win32/x64': 'x86_64-pc-windows-msvc.exe',
  'linux/x64': 'x86_64-unknown-linux-gnu',
  'linux/arm64': 'aarch64-unknown-linux-gnu',
}

function getPlatformTriple() {
  return (
    process.env.DAEMON_NAME ||
    // @ts-ignore
    LLVM_TRIPLES[`${process.platform}/${process.arch}`]
  )
}

const daemonBinaryPath = path.join(
  devProjectRoot,
  // TODO: parametrize this for each platform
  `plz-out/bin/backend/seed-daemon-${getPlatformTriple()}`,
)

let iconsPath = process.env.CI
  ? path.resolve(__dirname, 'assets', 'icons-nightly', 'icon')
  : path.resolve(__dirname, 'assets', 'icons', 'icon')

const commonLinuxConfig: MakerDebConfig = {
  options: {
    categories: ['Development', 'Utility'],
    icon: `${iconsPath}.png`,
    maintainer: 'Mintter Inc.',
    description: 'Seed: a hyper.media protocol client',
    productName: 'Seed',
    mimeType: ['x-scheme-handler/hm'],
    version,
    bin: 'Seed',
    homepage: 'https://seedhypermedia.com',
  },
}

const config: ForgeConfig = {
  packagerConfig: {
    appVersion: process.env.VITE_VERSION,
    asar: true,
    darwinDarkModeSupport: true,
    icon: iconsPath,
    name: 'Seed',
    appBundleId: 'com.seed.app',
    executableName: 'Seed',
    appCategoryType: 'public.app-category.productivity',
    // packageManager: 'yarn',
    extraResource: [daemonBinaryPath],
    // beforeCopy: [setLanguages(['en', 'en_US'])],
    win32metadata: {
      CompanyName: 'Mintter Inc.',
      OriginalFilename: 'Seed',
    },
    protocols: [{name: 'Seed Hypermedia', schemes: ['hm']}],
  },
  makers: [
    new MakerDeb(commonLinuxConfig),
    new MakerZIP({}, ['darwin']),
    new MakerSquirrel({
      name: 'Seed',
      authors: 'Mintter inc.',
      exe: 'seed.exe',
      description: 'Seed: a hyper.media protocol client',
      // An URL to an ICO file to use as the application icon (displayed in Control Panel > Programs and Features).
      iconUrl: `${iconsPath}.ico`,
      noMsi: true,
      setupIcon: `${iconsPath}.ico`,
      setupExe: `seed-${version}-win32-${process.arch}-setup.exe`,
      // The ICO file to use as the icon for the generated Setup.exe
      loadingGif: path.resolve(__dirname, 'assets', 'loading.gif'),

      // certificateFile: process.env.WINDOWS_PFX_FILE,
      // certificatePassword: process.env.WINDOWS_PFX_PASSWORD,
    }),
    new MakerRpm(commonLinuxConfig),
  ],
  plugins: [
    // {
    //   name: '@electron-forge/plugin-electronegativity',
    //   config: {
    //     isSarif: true,
    //   },
    // },
    // {
    //   name: '@electron-forge/plugin-auto-unpack-natives',
    //   config: {},
    // },
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
        },
        {
          entry: 'src/preload-find-in-page.ts',
          config: 'vite.preload.config.ts',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
        {
          name: 'find_in_page',
          config: 'vite.renderer.find-in-page.config.ts',
        },
      ],
    }),
  ],
  publishers: [],
}

function buildDMGMaybe() {
  if (process.platform !== 'darwin') {
    console.log(
      `[FORGE CONFIG]: 🍎 The platform we are building is not 'darwin'. skipping (platform: ${process.platform})`,
    )
    return
  }

  if (!process.env.CI) {
    console.log(`[FORGE CONFIG]: 🤖 Not in CI, skipping sign and notarization`)
    return
  }

  console.log(`[FORGE CONFIG]: 🎉 adding DMG maker to the config.`)

  config.makers?.push({
    name: '@electron-forge/maker-dmg',
    config: {
      background: './assets/dmg-background.png',
      format: 'ULFO',
    },
  })
}

function notarizeMaybe() {
  if (process.platform !== 'darwin') {
    console.log(
      `[FORGE CONFIG]: 🍎 The platform we are building is not 'darwin'. skipping (platform: ${process.platform})`,
    )
    return
  }

  if (!process.env.CI) {
    console.log(`[FORGE CONFIG]: 🤖 Not in CI, skipping sign and notarization`)
    return
  }

  if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASSWORD) {
    console.warn(
      `[FORGE CONFIG]: ❌ Should be notarizing, but environment variables APPLE_ID or APPLE_ID_PASSWORD are missing!`,
    )
    return
  }

  console.log(
    `[FORGE CONFIG]: 🎉 adding 'osxNotarize' and 'osxSign' values to the config. Proceed to Sign and Notarize`,
  )

  // @ts-expect-error
  config.packagerConfig.osxNotarize = {
    tool: 'notarytool',
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  }

  // @ts-expect-error
  config.packagerConfig.osxSign = {
    // @ts-expect-error
    entitlements: './entitlements.plist',
    executableName: 'Mintter',
    entitlementsInherit: './entitlements.plist',
    gatekeeperAssess: false,
    hardenedRuntime: true,
    identity:
      'Developer ID Application: Mintter Technologies S.L. (XSKC6RJDD8)',
    binaries: [daemonBinaryPath],
  }
}

notarizeMaybe()
buildDMGMaybe()

module.exports = config

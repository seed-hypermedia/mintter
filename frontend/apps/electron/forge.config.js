const path = require('path')
const packageJson = require('./package.json')

const {version} = packageJson

const devProjectRoot = path.join(process.cwd(), '../../..')
const LLVM_TRIPLES = {
  'darwin/x64': 'x86_64-apple-darwin',
  'darwin/arm64': 'aarch64-apple-darwin',
  'windows/x64': 'x86_64-pc-windows-msvc',
  'linux/x64': 'x86_64-unknown-linux-gnu',
  'linux/arm64': 'aarch64-unknown-linux-gnu',
}

function getPlatformTriple() {
  return LLVM_TRIPLES[`${process.platform}/${process.arch}`]
}
const daemonBinaryPath = path.join(
  devProjectRoot,
  // TODO: parametrize this for each platform
  `plz-out/bin/backend/mintterd-${getPlatformTriple()}`,
)

let iconsPath = process.env.CI
  ? path.resolve(__dirname, 'assets/icons-nightly/icon')
  : path.resolve(__dirname, 'assets/icons/icon')

const commonLinuxConfig = {
  categories: ['Development', 'Utility'],
  icon: {
    '1024x1024': `${iconsPath}.ico`,
    // scalable: path.resolve(iconDir, 'fiddle.svg'),
  },
  mimeType: ['x-scheme-handler/mintter-app'],
  version,
  bin: 'Mintter',
}

const config = {
  packagerConfig: {
    appVersion: process.env.APP_VERSION,
    asar: true,
    darwinDarkModeSupport: 'true',
    icon: iconsPath,
    name: 'mintter-app',
    appBundleId: 'com.mintter.app',
    executableName: 'Mintter',
    appCategoryType: 'public.app-category.productivity',
    osxSign: {
      entitlements: './entitlements.plist',
      'entitlements-inherit': './entitlements.plist',
      'gatekeeper-assess': false,
      hardenedRuntime: true,
      identity:
        'Developer ID Application: Mintter Technologies S.L. (XSKC6RJDD8)',
    },
    packageManager: 'yarn',
    extraResource: [daemonBinaryPath],
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: commonLinuxConfig,
    },
    // {
    //   name: '@electron-forge/maker-rpm',
    //   platforms: ['linux'],
    //   config: commonLinuxConfig,
    // },
    // {
    //   name: '@reforged/maker-appimage',
    //   platforms: ['linux'],
    //   config: {
    //     options: {
    //       categories: commonLinuxConfig.categories,
    //     },
    //   },
    // },
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'Mintter',
        exe: 'mintter.exe',
        // An URL to an ICO file to use as the application icon (displayed in Control Panel > Programs and Features).
        iconUrl: `${iconsPath}.ico`,
        noMsi: true,
        setupExe: `mintter-${version}-win32-${process.arch}-setup.exe`,
        // The ICO file to use as the icon for the generated Setup.exe
        setupIcon: `${iconsPath}.ico`,
        certificateFile: process.env.WINDOWS_PFX_FILE,
        certificatePassword: process.env.WINDOWS_PFX_PASSWORD,
      },
    },
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
    {
      name: '@electron-forge/plugin-vite',
      config: {
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
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.ts',
          },
        ],
      },
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'mintterteam',
          name: 'mintter',
        },
        prerelease: true,
        tagPrefix: process.env.TAG_PREFIX,
      },
    },
  ],
}

function notarizeMaybe() {
  if (process.platform !== 'darwin') {
    return
  }

  if (!process.env.CI) {
    // Not in CI, skipping notarization
    return
  }

  if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASSWORD) {
    console.warn(
      'Should be notarizing, but environment variables APPLE_ID or APPLE_ID_PASSWORD are missing!',
    )
    return
  }

  config.packagerConfig.osxNotarize = {
    tool: 'notarytool',
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  }
}

notarizeMaybe()

module.exports = config

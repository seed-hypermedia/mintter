import path from 'path'

export function getDaemonBinaryPath() {
  if (process.env.NODE_ENV == 'production') {
    return path.join(process.resourcesPath, `seed-daemon-${getPlatformTriple()}`)
  } else {
    return path.join(
      process.cwd(),
      '../../..',
      `plz-out/bin/backend/seed-daemon-${getPlatformTriple()}`,
    )
  }
}

function getPlatformTriple() {
  if (process.env.DAEMON_NAME) {
    return process.env.DAEMON_NAME
  } else {
    switch (`${process.platform}/${process.arch}`) {
      case 'darwin/x64':
        return 'x86_64-apple-darwin'
      case 'darwin/arm64':
        return 'aarch64-apple-darwin'
      case 'win32/x64':
        return 'x86_64-pc-windows-msvc'
      case 'linux/x64':
        return 'x86_64-unknown-linux-gnu'
      case 'linux/arm64':
        return 'aarch64-unknown-linux-gnu'
      default:
        return 'NO_DAEMON_NAME'
    }
  }
}

import {
  BACKEND_GRPC_PORT,
  BACKEND_HTTP_PORT,
  BACKEND_P2P_PORT,
} from '@mintter/app/src/constants'
import {spawn} from 'child_process'
import {app} from 'electron'
import {join} from 'path'
import {updateGoDaemonState} from './api'

console.log('== BACKEND_HTTP_PORT', BACKEND_HTTP_PORT)

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

const devProjectRoot = join(process.cwd(), '../../..')
const devDaemonBinaryPath = join(
  devProjectRoot,
  // TODO: parametrize this for each platform
  `plz-out/bin/backend/mintterd-${getPlatformTriple()}`,
)

console.log(`== ~ devDaemonBinaryPath:`, devDaemonBinaryPath)

const prodDaemonBinaryPath = join(
  process.resourcesPath,
  `mintterd-${getPlatformTriple()}`,
)

const userDataDir = join(app.getPath('userData'), 'daemon')

let goDaemonExecutablePath =
  process.env.NODE_ENV == 'development'
    ? devDaemonBinaryPath
    : prodDaemonBinaryPath

const daemonProcess = spawn(
  goDaemonExecutablePath,
  [
    // daemon arguments

    '-http-port',
    String(BACKEND_HTTP_PORT),

    '-grpc-port',
    String(BACKEND_GRPC_PORT),

    '-p2p.port',
    String(BACKEND_P2P_PORT),

    '-repo-path',
    userDataDir,
  ],
  {
    // daemon env
    cwd: devProjectRoot,
    env: {
      ...process.env,
    },
    stdio: 'pipe',
  },
)
let expectingDaemonClose = false
daemonProcess.on('error', (err) => {
  console.error('[god] process error', err)
})
daemonProcess.on('close', (code, signal) => {
  if (!expectingDaemonClose) {
    updateGoDaemonState({t: 'error', message: 'Service Error: ' + lastStderr})
    console.log('[god] daemon close', code, signal)
  }
})
daemonProcess.on('disconnect', () => {
  console.log('[god] unexpected disconnect')
})
daemonProcess.on('spawn', () => {
  console.log('[god] daemon launching')
})

daemonProcess.stdout.on('data', (data) => {
  const multilineString = data.toString()
  multilineString
    .split('\n')
    .forEach((msg) => msg && console.log('[god] ' + msg))
})
let lastStderr = ''
daemonProcess.stderr.on('data', (data) => {
  const multilineString = data.toString()
  lastStderr = multilineString
  multilineString
    .split('\n')
    .forEach((msg) => msg && console.log('[god!] ' + msg))
  if (multilineString.match('INFO') && multilineString.match('DaemonStarted')) {
    updateGoDaemonState({t: 'ready'})
  }
})
daemonProcess.stdout.on('error', (err) => {
  console.error('[god] output error:', err)
})
daemonProcess.stderr.on('error', (err) => {
  console.error('[god] output (stderr) error:', err)
})
daemonProcess.stdout.on('close', (code, signal) => {
  if (!expectingDaemonClose)
    console.error('[god] unexpected stdout close', code, signal)
})

app.addListener('will-quit', () => {
  console.log('[Main] App will quit')
  expectingDaemonClose = true
  daemonProcess.kill()
})

export const mainDaemon = {
  httpPort: BACKEND_HTTP_PORT,
  grpcPort: BACKEND_GRPC_PORT,
  p2pPort: BACKEND_P2P_PORT,
}

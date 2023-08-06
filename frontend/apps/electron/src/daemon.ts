import {app} from 'electron'
import {spawn} from 'child_process'
import {join} from 'path'
import {homedir, platform} from 'os'
import {
  BACKEND_P2P_PORT,
  BACKEND_GRPC_PORT,
  BACKEND_HTTP_PORT,
} from '@mintter/app/src/constants'
import {updateGoDaemonState} from './api'

console.log('== BACKEND_HTTP_PORT', BACKEND_HTTP_PORT)

const daemonName = {
  darwin: 'mintterd-aarch64-apple-darwin',
  linux: 'mintterd-x86_64-unknown-linux-gnu',
}

const devProjectRoot = join(process.cwd(), '../../..')
const devDaemonBinaryPath = join(
  devProjectRoot,
  // TODO: parametrize this for each platform
  `plz-out/bin/backend/${daemonName[platform()]}`,
)

console.log(`== ~ devDaemonBinaryPath:`, devDaemonBinaryPath)

const prodDaemonBinaryPath = join(
  process.resourcesPath,
  // TODO: parametrize this for each platform
  'mintterd-aarch64-apple-darwin',
)

let userDataDir = join(homedir(), '.mtt')
if (platform() === 'darwin') {
  userDataDir = join(
    homedir(),
    'Library',
    'Application Support',
    'com.mintter.dev',
  )
}

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

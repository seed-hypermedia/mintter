import {app} from 'electron'
import {spawn} from 'child_process'
import {join} from 'path'
import {homedir, platform} from 'os'

const devProjectRoot = join(process.cwd(), '../../..')
const daemonBinaryPath = join(
  devProjectRoot,
  // TODO: parametrize this for each platform
  'plz-out/bin/backend/mintterd-aarch64-apple-darwin',
)

const daemonHttpPort = 56011
const daemonGrpcPort = 56012
const daemonP2pPort = 56010

let userDataDir = join(homedir(), '.mtt')
if (platform() === 'darwin') {
  userDataDir = join(
    homedir(),
    'Library',
    'Application Support',
    'com.mintter.dev',
  )
}
const daemonProcess = spawn(
  daemonBinaryPath,
  [
    // daemon arguments

    '-http-port',
    String(daemonHttpPort),

    '-grpc-port',
    String(daemonGrpcPort),

    '-p2p.port',
    String(daemonP2pPort),

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
daemonProcess.stderr.on('data', (data) => {
  const multilineString = data.toString()
  multilineString
    .split('\n')
    .forEach((msg) => msg && console.log('[god] ' + msg))
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
  httpPort: daemonHttpPort,
  grpcPort: daemonGrpcPort,
  p2pPort: daemonP2pPort,
}

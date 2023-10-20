import {
  BACKEND_GRPC_PORT,
  BACKEND_HTTP_PORT,
  BACKEND_P2P_PORT,
} from '@mintter/shared'
import {spawn} from 'child_process'
import {color} from 'console-log-colors'
import {app} from 'electron'
import {join} from 'path'
import {APP_USER_DATA_PATH} from './app-paths'
import {childLogger, log} from './logger'
import {getAllWindows} from './app-windows'

const logger = childLogger(color.cyan('Go Daemon'))

const LLVM_TRIPLES = {
  'darwin/x64': 'x86_64-apple-darwin',
  'darwin/arm64': 'aarch64-apple-darwin',
  'win32/x64': 'x86_64-pc-windows-msvc',
  'linux/x64': 'x86_64-unknown-linux-gnu',
  'linux/arm64': 'aarch64-unknown-linux-gnu',
}

const getPlatformTriple = (): string => {
  return (
    process.env.DAEMON_NAME ||
    LLVM_TRIPLES[`${process.platform}/${process.arch}`]
  )
}

const devProjectRoot = join(process.cwd(), '../../..')
const devDaemonBinaryPath = join(
  devProjectRoot,
  // TODO: parametrize this for each platform
  `plz-out/bin/backend/mintterd-${getPlatformTriple()}`,
)

const prodDaemonBinaryPath = join(
  process.resourcesPath,
  `mintterd-${getPlatformTriple()}`,
)

const userDataDir = join(APP_USER_DATA_PATH, 'daemon')

let goDaemonExecutablePath =
  process.env.NODE_ENV == 'development'
    ? devDaemonBinaryPath
    : prodDaemonBinaryPath

let lndhubFlags =
  process.env.NODE_ENV == 'development'
    ? '-lndhub.mainnet=false'
    : '-lndhub.mainnet=true'

const daemonArguments = [
  '-http.port',
  String(BACKEND_HTTP_PORT),

  '-grpc.port',
  String(BACKEND_GRPC_PORT),

  '-p2p.port',
  String(BACKEND_P2P_PORT),

  '-data-dir',
  userDataDir,

  lndhubFlags,
]

type ReadyState = {t: 'ready'}
type ErrorState = {t: 'error'; message: string}
type StartupState = {t: 'startup'}

export type GoDaemonState = ReadyState | ErrorState | StartupState

let goDaemonState: GoDaemonState = {t: 'startup'}

export function getDaemonState() {
  return goDaemonState
}
const daemonStateHandlers = new Set<(state: GoDaemonState) => void>()
export function subscribeDaemonState(
  handler: (state: GoDaemonState) => void,
): () => void {
  daemonStateHandlers.add(handler)
  return () => {
    daemonStateHandlers.delete(handler)
  }
}

export function updateGoDaemonState(state: GoDaemonState) {
  goDaemonState = state
  daemonStateHandlers.forEach((handler) => handler(state))
}

export function startMainDaemon() {
  logger.info('Launching daemon:', goDaemonExecutablePath, daemonArguments)

  const daemonProcess = spawn(goDaemonExecutablePath, daemonArguments, {
    // daemon env
    cwd: devProjectRoot,
    env: {
      ...process.env,
    },
    stdio: 'pipe',
  })
  let expectingDaemonClose = false
  daemonProcess.on('error', (err) => {
    logger.error('Error:', err)
  })
  daemonProcess.on('close', (code, signal) => {
    if (!expectingDaemonClose) {
      updateGoDaemonState({
        t: 'error',
        message: 'Service Error: ' + lastStderr,
      })
      logger.error('Closed:', code, signal)
    }
  })
  daemonProcess.on('spawn', () => {
    // logger.info('Spawned')
  })

  daemonProcess.stdout.on('data', (data) => {
    const multilineString = data.toString()
    multilineString.split('\n').forEach((msg) => msg && logger.info(msg))
  })
  let lastStderr = ''
  daemonProcess.stderr.on('data', (data) => {
    const multilineString = data.toString()
    lastStderr = multilineString
    multilineString.split('\n').forEach((msg) => msg && logger.warn(msg))
    if (
      multilineString.match('INFO') &&
      multilineString.match('DaemonStarted')
    ) {
      updateGoDaemonState({t: 'ready'})
    }
  })
  daemonProcess.stdout.on('error', (err) => {
    logger.error('output error:', err)
  })
  daemonProcess.stderr.on('error', (err) => {
    logger.error('output (stderr) error:', err)
  })
  daemonProcess.stdout.on('close', (code, signal) => {
    if (!expectingDaemonClose)
      logger.error('unexpected stdout close', code, signal)
  })

  app.addListener('will-quit', () => {
    log('App will quit')
    expectingDaemonClose = true
    daemonProcess.kill()
  })

  const mainDaemon = {
    httpPort: BACKEND_HTTP_PORT,
    grpcPort: BACKEND_GRPC_PORT,
    p2pPort: BACKEND_P2P_PORT,
  }
  return mainDaemon
}

import {GRPC_PORT, HTTP_PORT, P2P_PORT, VERSION} from '@mintter/shared'
import {spawn} from 'child_process'
import {app} from 'electron'
import path from 'path'
import {IS_PROD, userDataPath} from './app-paths'
import {getDaemonBinaryPath} from './daemon-path'
import {childLogger, info} from './logger'
const logger = childLogger('Go Daemon')

let goDaemonExecutablePath = getDaemonBinaryPath()

let lndhubFlags = IS_PROD ? '-lndhub.mainnet=true' : '-lndhub.mainnet=false'

const daemonArguments = [
  '-http.port',
  String(HTTP_PORT),

  '-grpc.port',
  String(GRPC_PORT),

  '-p2p.port',
  String(P2P_PORT),

  '-data-dir',
  `${userDataPath}/daemon`,

  lndhubFlags,
  'SENTRY_DSN=https://8d3089ffb71045dc911bc66efbd3463a@o4504088793841664.ingest.sentry.io/4505527460429824',
]

if (process.env.SENTRY_AUTH_TOKEN) {
  daemonArguments.push(`SENTRY_AUTH_TOKEN=${process.env.SENTRY_AUTH_TOKEN}`)
}

console.log(`== ~ daemonArguments:`, daemonArguments)

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
    cwd: path.join(process.cwd(), '../../..'),
    env: {
      ...process.env,
      SENTRY_RELEASE: VERSION,
    },
    stdio: 'pipe',
  })
  let expectingDaemonClose = false
  daemonProcess.on('error', (err) => {
    logger.error('Error:', err)
    console.log('ERROR', err)
  })
  daemonProcess.on('close', (code, signal) => {
    if (!expectingDaemonClose) {
      updateGoDaemonState({
        t: 'error',
        message: 'Service Error: !!!' + lastStderr,
      })
      logger.error('Closed:', code, signal)
    }
  })
  daemonProcess.on('spawn', () => {
    // logger.info('Spawned')
  })

  daemonProcess.stdout.on('data', (data) => {
    const multilineString = data.toString()
    multilineString
      .split('\n')
      .forEach((msg: string) => msg && logger.info(msg))
  })
  let lastStderr = ''
  daemonProcess.stderr.on('data', (data) => {
    const multilineString = data.toString()
    lastStderr = multilineString
    multilineString
      .split('\n')
      .forEach((msg: string) => msg && logger.warn(msg))
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
  // TODO: review types
  daemonProcess.stdout.on('close', (code: string, signal: string) => {
    if (!expectingDaemonClose)
      logger.error('unexpected stdout close', code, signal)
  })

  app.addListener('will-quit', () => {
    info('App will quit')
    expectingDaemonClose = true
    daemonProcess.kill()
  })

  const mainDaemon = {
    httpPort: process.env.VITE_DESKTOP_HTTP_PORT,
    grpcPort: process.env.VITE_DESKTOP_GRPC_PORT,
    p2pPort: process.env.VITE_DESKTOP_P2P_PORT,
  }
  return mainDaemon
}

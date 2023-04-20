import {spawn, ChildProcess} from 'child_process'
import {join} from 'path'
import {remove} from 'fs-extra'

const filterControlCharacters = (data: Buffer): string => {
  // Match ASCII control characters (0-31) and extended ASCII control characters (127-159)
  const controlCharsRegex = /[\x00-\x1F\x7F-\x9F]/g
  return data.toString().replace(controlCharsRegex, '')
}

const mttRootDir = join(process.cwd(), '../..')

const runDaemon = (
  label: string,
  command: string,
  args: string[],
): ChildProcess => {
  const childProcess = spawn(command, args, {
    cwd: mttRootDir,
    env: {
      ...process.env,
    },
  })
  childProcess.stdout.on('data', (data) => {
    console.log(`[${label}] ${filterControlCharacters(data)}`)
  })
  childProcess.stderr.on('data', (data) => {
    console.error(`[${label}]! ${filterControlCharacters(data)}`)
  })
  childProcess.on('error', (error) => {
    console.error(`[${label}]!!`, error)
  })
  return childProcess
}

function startup() {
  const daemons: ChildProcess[] = [
    // ./dev run-backend -repo-path /Users/ericvicenti/Code/mintter/test-mtt-data
    runDaemon('Daemon', './dev', [
      'run-backend',
      '-repo-path',
      join(mttRootDir, '.mtt-test'),
    ]),
    runDaemon('Vite', 'yarn', ['desktop']),
  ]

  const handleSignal = (signal: NodeJS.Signals) => {
    console.log(`Received ${signal}, terminating child processes.`)
    for (const daemon of daemons) {
      daemon.kill(signal)
    }
    process.exit(0)
  }

  process.on('SIGINT', handleSignal)
  process.on('SIGTERM', handleSignal)
}

async function prepare() {
  let daemonLocation = join(mttRootDir, '.mtt-test')
  console.log('removing test data dir: ' + daemonLocation)
  await remove(daemonLocation)
}

prepare().then(() => startup())

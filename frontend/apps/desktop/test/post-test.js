const path = require('path')
const fs = require('fs')
const os = require('os')
const fsExtra = require('fs-extra')

let appDataPath = {
  darwin: `${os.homedir()}/Library/Application Support`,
  linux: `${os.homedir()}/.config`,
  win32: '%APPDATA%',
}

const daemonPath = path.join(appDataPath[process.platform], 'Mintter', 'daemon')

const daemonTempPath = `${daemonPath}_temp`

if (!process.env.CI) {
  cleanup()
}

// ========

function cleanup() {
  console.error('[DESKTOP TEST]: Start cleanup')
  console.log('[DESKTOP TEST]: remove daemon test folder generated')
  fs.rm(daemonPath, {recursive: true, force: true}, () => {})

  if (fs.existsSync(daemonTempPath)) {
    console.log(`[DESKTOP TEST]: restore previous daemon folder back`)
    // Rename the '_temp' folder back to 'daemon'
    fsExtra.copySync(daemonTempPath, daemonPath)
    fs.rm(daemonTempPath, {recursive: true, force: true}, () => {})
  }

  console.error('[DESKTOP TEST]: Finish cleanup')
}

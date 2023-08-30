const path = require('path')
const fs = require('fs')
const os = require('os')

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
  if (fs.existsSync(daemonPath)) {
    console.log('[DESKTOP TEST]: remove daemon test folder generated')
    fs.rm(daemonPath, {recursive: true}, () => {})
  }

  if (fs.existsSync(daemonTempPath)) {
    if (!fs.existsSync(daemonPath)) {
      console.log(`[DESKTOP TEST]: restore previous daemon folder back`)
      // Rename the '_temp' folder back to 'daemon'
      fs.renameSync(daemonTempPath, daemonPath)
    } else {
      console.log(`[DESKTOP TEST]: test daemon folder exists. ERROr`)
    }
  }
}

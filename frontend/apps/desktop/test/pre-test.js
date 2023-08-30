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
  checkAndRenameFolder(daemonPath)
}

// ========

function checkAndRenameFolder(path) {
  console.error('[DESKTOP TEST]: Start preTest')
  console.log(`[DESKTOP TEST]: Checking if ${daemonPath} folder exists`)
  fs.rm(daemonTempPath, {recursive: true}, () => {})
  if (fs.existsSync(daemonPath)) {
    if (fs.existsSync(daemonTempPath)) {
      console.log(
        `[DESKTOP TEST]: daemon test path already exists, proceed to remove current daemon...`,
      )
      fs.rm(daemonPath, {recursive: true}, () => {})
    } else {
      console.log(
        `[DESKTOP TEST]: daemon path already exists, proceed to rename...`,
      )
    }
    fs.renameSync(daemonPath, daemonTempPath)
  } else {
    console.log(
      `[DESKTOP TEST]: daemon folder does not exist. no action required`,
    )
  }
  console.error('[DESKTOP TEST]: Finish preTest')
}

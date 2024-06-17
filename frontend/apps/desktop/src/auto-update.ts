import {IS_PROD_DESKTOP} from '@shm/shared'
import {MessageBoxOptions, app, autoUpdater, dialog, shell} from 'electron'
import log from 'electron-log/main'
import {appStore} from './app-store'

const AUTOUPDATE_KEY = 'Update-v001'

export function defaultCheckForUpdates() {
  log.debug('[MAIN][AUTO-UPDATE]: checking for Updates')
  // ipcMain.emit(ipcMainEvents.CHECK_FOR_UPDATES_START)
  try {
    autoUpdater.checkForUpdates()
  } catch (error) {}
  // ipcMain.emit(ipcMainEvents.CHECK_FOR_UPDATES_END)
  log.debug('[MAIN][AUTO-UPDATE]: checking for Updates END')
}

export function linuxCheckForUpdates() {
  if (shouldCheckForUpdate()) {
    log.debug('[MAIN][AUTO-UPDATE]: checking for Updates')
    // ipcMain.emit(ipcMainEvents.CHECK_FOR_UPDATES_START)
    try {
      // TODO: change this to fetch THE LATEST version and compare it with `app.getVersion()`
      fetch(
        `https://update.electronjs.org/MintterHypermedia/mintter/darwin-x64/${app.getVersion()}`,
      ).then((res) => {
        if (res) {
          log.debug('[MAIN][AUTO-UPDATE]: LINUX NEED TO UPDATE', res)
          const dialogOpts: MessageBoxOptions = {
            type: 'info',
            buttons: ['Go and Download', 'Close'],
            title: 'Application Update',
            message: 'New release available',
            detail:
              'A new version is available. Go and Download the new version!',
          }

          dialog.showMessageBox(dialogOpts).then((returnValue: any) => {
            log.debug('[MAIN][AUTO-UPDATE]: Quit and Install')
            if (returnValue.response === 0)
              shell.openExternal(
                'https://github.com/MintterHypermedia/mintter/releases/latest',
              )
          })
        } else {
          log.debug('[MAIN][AUTO-UPDATE]: LINUX IS UPDATED', res)
        }
      })
    } catch (error) {}
    // ipcMain.emit(ipcMainEvents.CHECK_FOR_UPDATES_END)
  } else {
    log.debug(
      '[MAIN][AUTO-UPDATE]: NO NEED TO CHECK FOR UPDATES YET:',
      appStore.get(AUTOUPDATE_KEY),
    )
  }
}

export default function autoUpdate() {
  if (!IS_PROD_DESKTOP) {
    log.debug('[MAIN][AUTO-UPDATE]: Not available in development')
    return
  }
  if (!isAutoUpdateSupported()) {
    log.debug('[MAIN][AUTO-UPDATE]: Auto-Update is not supported')
    return
  }

  let checkForUpdates =
    process.platform == 'linux' ? linuxCheckForUpdates : defaultCheckForUpdates

  if (process.platform != 'linux') {
    setup()
  }

  setTimeout(() => {
    // we are doing this after 2 seconds of startup so the app will not have to deal with this on startup.
    // copied from Electron Fiddle :)
    checkForUpdates()
  }, 2000)

  setInterval(checkForUpdates, 43200000) // every 12 hours
}

// ======================================

// let feedback = false

function isAutoUpdateSupported() {
  // TODO: we need to enable a setting so people can disable auto-updates
  return true
}

function setup() {
  /**
   * - disables autoDownload
   * - enables autoInstall and app  quit
   * - sets the logger
   * - adopt the `feedback` variable to show/hide dialogs
   */

  const updateUrl = `https://update.electronjs.org/MintterHypermedia/mintter/${
    process.platform
  }-${process.arch}/${app.getVersion()}`

  autoUpdater.setFeedURL({url: updateUrl})

  autoUpdater.on('error', (message) => {
    log.error(
      `[MAIN][AUTO-UPDATE]: There was a problem updating the application: ${message}`,
    )
  })

  autoUpdater.on('update-available', async () => {
    log.debug(`[MAIN][AUTO-UPDATE]: update available, download will start`)
    try {
    } catch (error) {}
  })

  autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
    log.debug('[MAIN][AUTO-UPDATE]: New version downloaded')
    const dialogOpts: MessageBoxOptions = {
      type: 'info',
      buttons: ['Restart', 'Later'],
      title: 'Application Update',
      message: process.platform == 'win32' ? releaseNotes : releaseName,
      detail:
        'A new version has been downloaded. Restart the application to apply the updates.',
    }

    dialog.showMessageBox(dialogOpts).then((returnValue: any) => {
      log.debug('[MAIN][AUTO-UPDATE]: Quit and Install')
      if (returnValue.response === 0) autoUpdater.quitAndInstall()
    })
  })

  autoUpdater.on('update-not-available', (event: any) => {
    log.debug('[MAIN][AUTO-UPDATE]: update not available', event)
  })

  // let progressPercentTimeout = null
  // autoUpdater.on('', ({ percent, bytesPerSecond }) => {
  //   const logDownloadProgress = () => {
  //     logger.info(`[updater] download progress is ${percent.toFixed(2)}% at ${bytesPerSecond} bps.`)
  //   }
  //   // log the percent, but not too often to avoid spamming the logs, but we should
  //   // be sure we're logging at what percent any hiccup is occurring.
  //   clearTimeout(progressPercentTimeout)
  //   if (percent === 100) {
  //     logDownloadProgress()
  //     return
  //   }
  //   progressPercentTimeout = setTimeout(logDownloadProgress, 2000)
  // })
}

// fetch(
//   `https://update.electronjs.org/MintterHypermedia/mintter/darwin-x64/2023.11.4`,
// )
//   .then((res) => {
//     console.log('== AUTOUPDATE THEN', res.body)
//   })
//   .catch((res) => {
//     console.log('== AUTOUPDATE CATCH', res)
//   })
//   .finally(() => {
//     // console.log('== AUTOUPDATE FINALLY')
//   })

function shouldCheckForUpdate() {
  // Convert date strings to Date objects
  const storedDate = appStore.get(AUTOUPDATE_KEY) as string
  log.debug('[MAIN][AUTO-UPDATE]: SHOULD UPDATE INIT', storedDate)
  const currentDate = new Date()
  if (storedDate) {
    const prevDate = storedDate ? new Date(storedDate) : new Date()

    // Calculate the difference in milliseconds
    // @ts-expect-error
    const timeDifference = currentDate - prevDate

    // Calculate the number of milliseconds in a day
    const oneDayInMilliseconds = 24 * 60 * 60 * 1000

    // Check if the new date is at least one day later than the previous date
    log.debug(
      '[MAIN][AUTO-UPDATE]: SHOULD UPDATE?',
      timeDifference >= oneDayInMilliseconds,
    )
    return timeDifference >= oneDayInMilliseconds
  } else {
    log.debug('[MAIN][AUTO-UPDATE]: SHOULD UPDATE NOTHING STORED')
    storeCurrentDate(currentDate)
    return true
  }
}

function storeCurrentDate(date: Date) {
  date.setHours(0)
  date.setMinutes(0)
  date.setSeconds(0, 0)

  appStore.set(AUTOUPDATE_KEY, date.toISOString())
}

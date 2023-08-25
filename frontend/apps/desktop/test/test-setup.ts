import {
  ElectronApplication,
  Page,
  _electron as electron,
  expect,
  test,
} from '@playwright/test'
import path from 'path'
import {findLatestBuild, parseElectronApp} from 'electron-playwright-helpers'

let electronApp: ElectronApplication

test.beforeAll(async () => {
  // remove the app data:

  // find the latest build in the out directory
  const latestBuild = findLatestBuild()

  // parse the directory and find paths and other info
  const appInfo = parseElectronApp(latestBuild)

  // set the CI environment variable to true
  process.env.CI = 'e2e'

  electronApp = await electron.launch({
    args: [appInfo.main],
    executablePath: appInfo.executable,
  })

  electronApp.on('window', async (page) => {
    const filename = page.url()?.split('/').pop()

    // capture errors
    page.on('pageerror', (error) => {
      console.error(error)
    })
    // capture console messages
    page.on('console', (msg) => {
      console.log(msg.text())
    })
  })
})

test.afterAll(async () => {
  // close app
  await electronApp.close()
})

export {electronApp}

export const alias = 'test alias'
export const bio = 'some random test bio'

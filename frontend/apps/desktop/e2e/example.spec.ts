import {
  ElectronApplication,
  Page,
  _electron as electron,
  expect,
  test,
} from '@playwright/test'
import {findLatestBuild, parseElectronApp} from 'electron-playwright-helpers'

let electronApp: ElectronApplication

test.beforeAll(async () => {
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
    console.log(`Window opened: ${filename}`)

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

let page: Page

test('renders the first page', async () => {
  page = await electronApp.firstWindow()
  await page.waitForSelector('[role="heading"]')
  const text = await page.$eval('[role="heading"]', (el) => el.textContent)
  expect(text).toBe('All Publications')
  const title = await page.title()
  expect(title).toBe('Mintter Renderer')
})

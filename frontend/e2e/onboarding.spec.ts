import {test, expect, Page} from '@playwright/test'
import {encodeRouteToPath} from '@mintter/desktop/src/utils/route-encoding'
import type {NavRoute} from '@mintter/desktop/src/utils/navigation'

test('has expected title - vite is here', async ({page}) => {
  await page.goto('http://localhost:5173/')
  await expect(page).toHaveTitle('Vite + React + TS')
})

const host = 'http://localhost:5173'

async function goToRoute(page: Page, route: NavRoute) {
  const dest = `${host}/${encodeRouteToPath(route)}`
  console.log('Routing to:', dest)
  // here is an example "settings" route
  // await page.goto(host + '/eyJrZXkiOiJzZXR0aW5ncyJ9')
  return await page.goto(dest)
}
async function goToHome(page: Page) {
  return await page.goto(host)
}

test('welcome steps', async ({page}) => {
  await goToHome(page)
  await page.setViewportSize({width: 1000, height: 800})
  await expect(page.getByText('Welcome to Mintter')).toBeVisible()
  await page.getByText('NEXT').click()
  await expect(page.getByText('Your Keys')).toBeVisible()
  await page.getByText('NEXT').click()
  await expect(page.getByText('Link your personal data')).toBeVisible()
  await page.getByLabel('Alias').fill('Monkey')
  await page.getByText('NEXT').click()
  await expect(page.getByText('Analytics')).toBeVisible()
  await page.getByText('NEXT').click()
  await expect(
    page.getByText('You just created your Mintter account'),
  ).toBeVisible()
  await page.getByText('Open Mintter App').click()
  await expect(page.getByText('You have no Publications yet.')).toBeVisible()
  await goToRoute(page, {key: 'settings'})
  await expect(page.getByText('Profile information')).toBeVisible()
  await expect(page.getByLabel('Alias').inputValue()).toEqual('Monkey')
})

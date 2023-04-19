import {test, expect} from '@playwright/test'

test('has expected title - vite is here', async ({page}) => {
  await page.goto('http://localhost:5173/')
  await expect(page).toHaveTitle('Vite + React + TS')
})

test('welcome steps', async ({page}) => {
  await page.goto('http://localhost:5173/')
  await page.setViewportSize({width: 1000, height: 800})
  await expect(page.getByText('Welcome to Mintter')).toBeVisible()
  await page.getByText('NEXT').click()
  await expect(page.getByText('Your Keys')).toBeVisible()
  await page.getByText('NEXT').click()
  await expect(page.getByText('Link your personal data')).toBeVisible()
  await page.getByLabel('Alias').fill('Monkey')
  await page.getByText('NEXT').click()
  // currently failing on this step:
  await expect(page.getByText('Analytics')).toBeVisible()
  await page.getByText('NEXT').click()
  await expect(
    page.getByText('You just created your Mintter account'),
  ).toBeVisible()
  await page.getByText('Open Mintter App').click()
  await expect(page.getByText('You have no Publications yet.')).toBeVisible()
})

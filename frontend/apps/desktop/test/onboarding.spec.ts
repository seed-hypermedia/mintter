import {Page, test, expect} from '@playwright/test'
import {alias, bio, electronApp} from './test-setup'

let page: Page

test('Onboarding: New Account', async () => {
  page = await electronApp.firstWindow()

  await page.waitForSelector('#welcome-title-section')

  // const text = await page.$eval(
  //   '[data-testid="step-title"]',
  //   (el) => el.textContent,
  // )
  const welcomeTitles = await page
    .locator('#welcome-title-section')
    .allTextContents()

  console.log(`== ~ test ~ welcomeTitles:`, welcomeTitles)
  expect(welcomeTitles).toEqual(['Welcome toMintter'])

  await page.click('#btn-new-account')

  await page.waitForSelector('#mnemonics-title-section')

  // Mnemonics Step
  const mnemonicsTitles = await page
    .locator('#mnemonics-title-section')
    .allTextContents()
  console.log(`== ~ test ~ mnemonicsTitles:`, mnemonicsTitles)
  expect(mnemonicsTitles).toEqual(['Your Keys.Your Data.'])
  const mnemonics = await page.locator('#mnemonics')
  expect(mnemonics).toBeVisible()

  // await page.waitForTimeout(5000)
  // // check prev button
  expect(await page.locator('#btn-next')).toBeVisible()
  expect(await page.locator('#btn-prev')).not.toBeDisabled()

  // // check if the mnemonics are the correct amount of words
  let text = (await mnemonics.allTextContents())[0]
  let words = text?.split(', ')

  console.log(`== ~ test ~ words:`, words)
  expect(words).toHaveLength(12)

  // // toggle own seed textarea
  await page.click('#btn-toggle-seed')
  const textarea = await page.locator('#mnemonics-input')
  expect(textarea).toBeVisible()
  await page.click('#btn-toggle-seed')

  // // continue to next step
  await page.click('#btn-next')

  await page.waitForSelector('#profile-title-section')
  // // check Profile step title
  const profileTitles = await page
    .locator('#profile-title-section')
    .allTextContents()
  console.log(`== ~ test ~ profileTitles:`, profileTitles)
  expect(profileTitles).toEqual(['ProfileInformation'])

  // // check profile alias input
  let inputAlias = await page.locator('#alias')
  expect(inputAlias).toBeVisible()
  await inputAlias.fill(alias)

  // // check profile bio input
  let inputBio = await page.locator('#bio')
  expect(inputBio).toBeVisible()
  await inputBio.fill(bio)

  page.waitForTimeout(100)
  // // check prev button
  // expect(await page.locator('#btn-next')).toBeVisible()
  // expect(await page.locator('#btn-prev')).not.toBeDisabled()

  // continue to next step
  await page.click('#btn-next')

  // page.waitForTimeout(1000)

  await page.waitForSelector('#analytics-title-section')
  // // check Analytics step title
  const analyticsTitles = await page
    .locator('#analytics-title-section')
    .allTextContents()
  expect(analyticsTitles).toEqual(['CrashAnalytics'])

  // // check prev button
  // expect(await page.locator('#btn-next')).toBeVisible()
  // expect(await page.locator('#btn-prev')).not.toBeDisabled()

  // // continue to next step
  // await page.click('#btn-next')
  // // await page.waitForTimeout(10000)

  // // check finish step
  // await page.waitForSelector('#complete-title-section')
  // // check Analytics step title
  // const finishTitles = await page
  //   .locator('#complete-title-section')
  //   .allTextContents()
  // expect(finishTitles).toEqual(['You are Ready!'])

  // await page.getByRole('button', {name: 'Open Mintter App'}).click()
})

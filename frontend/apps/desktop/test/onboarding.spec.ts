import {Page, test, expect} from '@playwright/test'
import {alias, bio, electronApp} from './test-setup'

let page: Page

test('Onboarding', async () => {
  page = await electronApp.firstWindow()

  await page.waitForSelector('[role=heading]')
  // const text = await page.$eval(
  //   '[data-testid="step-title"]',
  //   (el) => el.textContent,
  // )
  const welcomeTitles = await page.getByRole('heading').allTextContents()
  expect(welcomeTitles).toEqual(['Welcome to', 'Mintter'])

  await page.getByRole('button', {name: 'NEXT'}).click()

  // Mnemonics Step
  const mnemonicsTitles = await page.getByRole('heading').allTextContents()
  expect(mnemonicsTitles).toEqual(['Your Keys.', 'Your Data.'])
  const mnemonics = await page.getByTestId('mnemonics')
  expect(mnemonics).toBeVisible()

  // check prev button
  expect(await page.getByRole('button', {name: 'PREV'})).toBeVisible()
  expect(await page.getByRole('button', {name: 'PREV'})).not.toBeDisabled()

  // check if the mnemonics are the correct amount of words
  let text = (await mnemonics.allTextContents())[0]
  let words = text?.split(', ')
  expect(words).toHaveLength(12)

  // toggle own seed textarea
  await page.getByTestId('ownseed-btn').click()
  const textarea = await page.getByPlaceholder('food barrel buzz ...')
  expect(textarea).toBeVisible()
  await page.getByTestId('ownseed-btn').click({force: true})

  // continue to next step
  await page.getByRole('button', {name: 'NEXT'}).click()

  // check Profile step title
  const profileTitles = await page.getByRole('heading').allTextContents()
  expect(profileTitles).toEqual(['Profile', 'Information'])

  // check profile alias input
  let inputAlias = await page.getByPlaceholder(
    `Readable alias or username. Doesn't have to be unique.`,
  )
  expect(inputAlias).toBeVisible()
  await inputAlias.type(alias)

  // check profile bio input
  let inputBio = await page.getByPlaceholder(`A little bit about yourself...`)
  expect(inputBio).toBeVisible()
  await inputBio.type(bio)

  // check prev button
  expect(await page.getByRole('button', {name: 'PREV'})).toBeVisible()
  expect(await page.getByRole('button', {name: 'PREV'})).not.toBeDisabled()

  // continue to next step
  await page.getByRole('button', {name: 'NEXT'}).click()

  await page.waitForTimeout(10)
  // check Analytics step title
  const analyticsTitles = await page.getByRole('heading').allTextContents()
  expect(analyticsTitles).toEqual(['Crash', 'Analytics'])

  // check prev button
  expect(await page.getByRole('button', {name: 'PREV'})).toBeVisible()
  expect(await page.getByRole('button', {name: 'PREV'})).not.toBeDisabled()

  // continue to next step
  await page.getByRole('button', {name: 'NEXT'}).click()
  // await page.waitForTimeout(10000)

  // check finish step
  await page.waitForTimeout(10)
  // check Analytics step title
  const finishTitles = await page.getByRole('heading').allTextContents()
  expect(finishTitles).toEqual(['You are Ready!'])

  await page.getByRole('button', {name: 'Open Mintter App'}).click()
})

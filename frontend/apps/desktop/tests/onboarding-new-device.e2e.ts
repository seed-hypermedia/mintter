import {test} from '../test/fixtures'

import {expect} from '@playwright/test'

test('Onboarding by adding a new device to account', async ({
  onboardingPage,
}) => {
  let {appWindow} = onboardingPage.appData

  await test.step('Welcome Screen', async () => {
    let startBtn = await appWindow.locator('#btn-new-device')
    await expect(startBtn).toBeVisible()
    await startBtn.click()
  })

  await test.step('Add new Device with Secret Recovery phrase', async () => {
    let elOwnWordsInput = await appWindow.getByRole('textbox')
    let elNextBtn = await appWindow.getByRole('button', {name: 'NEXT'})
    await elOwnWordsInput.fill('foo')
    await elNextBtn.click()
    expect(await appWindow.locator('#mnemonics-error-box')).toBeVisible()
    await elOwnWordsInput.clear()
    await elOwnWordsInput.fill(
      'rib canal floor bubble hundred wild bring olive minimum veteran tip snack',
    )
    await elNextBtn.click()
  })

  await test.step('Connect to Site', async () => {
    let elNextBtn = await appWindow.locator('#btn-next')
    let elSkipBtn = await appWindow.locator('#btn-skip')
    expect(elNextBtn).toBeInViewport()
    await elSkipBtn.click()
  })
})

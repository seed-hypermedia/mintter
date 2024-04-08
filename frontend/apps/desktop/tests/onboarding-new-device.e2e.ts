import {test} from '../test/fixtures'

import {expect} from '@playwright/test'

test('Onboarding by adding a new device to account', async ({
  onboardingPage,
}) => {
  let {appWindow} = onboardingPage.appData

  await test.step('Welcome Screen', async () => {
    // await appWindow.pause()
    await appWindow
      .getByRole('button', {
        name: 'or add a new device to your',
      })
      .click({force: true})
  })

  await test.step('Add new Device with Secret Recovery phrase', async () => {
    let elOwnWordsInput = await appWindow.getByRole('textbox')
    let elNextBtn = await appWindow.getByRole('button', {name: 'NEXT'})
    let elCheck1 = await appWindow.locator('#check1')
    await expect(elNextBtn).toBeDisabled()
    await elOwnWordsInput.fill('foo')
    await elCheck1.check()
    await expect(elNextBtn).not.toBeDisabled()
    await elNextBtn.click()
    await expect(await appWindow.locator('#mnemonics-error-box')).toBeVisible()
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

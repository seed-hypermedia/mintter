import {test} from '../test/fixtures'

import {expect} from '@playwright/test'

test('Onboarding With recovery phrase', async ({onboardingPage}) => {
  let {appWindow} = onboardingPage.appData

  await test.step('Welcome Screen', async () => {
    // await appWindow.pause()
    await appWindow
      .getByRole('button', {
        name: 'Create a new Account',
      })
      .click({force: true})
  })

  await test.step('Secret Recovery phrase', async () => {
    let elOwnWordsTabBtn = await appWindow.locator('#btn-tab-ownwords')
    let elOwnWordsInput = await appWindow.locator('#ownwords-input')
    let elNextBtn = await appWindow.locator('#btn-next')

    await elOwnWordsTabBtn.click()
    await expect(elOwnWordsInput).toBeVisible()
    let elCheck3 = await appWindow.locator('#check3')
    await expect(elNextBtn).toBeDisabled()
    await elOwnWordsInput.fill('foo')
    await elCheck3.check()
    await expect(elNextBtn).not.toBeDisabled()
    await elNextBtn.click()
    await expect(await appWindow.locator('#mnemonics-error-box')).toBeVisible()
    await elOwnWordsInput.clear()
    await elOwnWordsInput.fill(
      'rib canal floor bubble hundred wild bring olive minimum veteran tip snack',
    )
    await elNextBtn.click()
  })

  await test.step('Profile data', async () => {
    let elAlias = appWindow.locator('#alias')
    let elNextBtn = await appWindow.locator('#btn-next')
    await elAlias.fill('testAlias')

    await elNextBtn.click()
  })

  await test.step('Wallet', async () => {
    // let elWalletBtn = await appWindow.locator('#btn-accept-wallet')
    let elNextBtn = await appWindow.locator('#btn-next')
    // elWalletBtn.click()
    // expect(elWalletBtn).toBeVisible()
    expect(elNextBtn).toBeInViewport()
    await elNextBtn.click()
  })

  await test.step('Analytics', async () => {
    let elNextBtn = await appWindow.locator('#btn-next')
    expect(elNextBtn).toBeInViewport()
    await elNextBtn.click()
  })

  await test.step('Connect to Site', async () => {
    let elNextBtn = await appWindow.locator('#btn-next')
    let elSkipBtn = await appWindow.locator('#btn-skip')
    expect(elNextBtn).toBeInViewport()
    await elSkipBtn.click()
  })
})

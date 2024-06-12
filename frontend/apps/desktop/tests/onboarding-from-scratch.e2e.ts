import {test} from '../test/fixtures'

import {expect} from '@playwright/test'

test.skip('Onboarding from scratch', async ({onboardingPage}) => {
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
    let elPhrase = await appWindow.locator('#recovery-phrase-words')
    let phraseTxt = await elPhrase.textContent()
    let elNextBtn = await appWindow.locator('#btn-next')
    let elCheck1 = await appWindow.locator('#check1')
    let elCheck2 = await appWindow.locator('#check2')
    await expect(phraseTxt).toBeTruthy()
    await expect(phraseTxt?.split(' ').length).toEqual(12)
    await expect(elNextBtn).toBeDisabled()
    await elCheck1.check()
    await elCheck2.check()
    expect(elNextBtn).not.toBeDisabled()
    await elNextBtn.click()
  })

  await test.step('Profile Data', async () => {
    let elAlias = appWindow.locator('#alias')
    let elNextBtn = await appWindow.locator('#btn-next')
    await elAlias.fill('testAlias')
    await elNextBtn.click()
  })

  await test.step('Wallet', async () => {
    // TODO: make sure we run this when we can run the wallet service locally
    // let elWalletBtn = await appWindow.locator('#btn-accept-wallet')
    let elNextBtn = await appWindow.locator('#btn-next')
    // we need to give the backend some warm-up time for this to work.
    // await appWindow.waitForTimeout(10_000)
    // await elWalletBtn.click()
    // let elWalletSuccessMssg = await appWindow.getByText(
    //   'Your wallet is ready to use!',
    // )
    // await expect(elWalletSuccessMssg).toBeVisible()
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

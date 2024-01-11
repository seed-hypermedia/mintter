import {test as baseTest} from '@playwright/test'
import {HomePage} from './home-page.pom'
import {OnboardingPage} from './onboadring.pom'
import {startApp} from './utils'

export const test = baseTest.extend<{
  onboardingPage: OnboardingPage
  homePage: HomePage
}>({
  /**
   *
   * This fixture will start the app with no account
   */
  onboardingPage: async ({}, use) => {
    let data = await startApp()
    let onboardingPage = new OnboardingPage(data)
    await use(onboardingPage)

    await onboardingPage.appData.appWindow.close()
    await onboardingPage.appData.app.close()
  },
  /**
   *
   * This fixture will create a new account and land you on the home screen
   */
  homePage: async ({}, use) => {
    let alias = 'testAlias'
    let bio = 'test bio'
    let data = await startApp()
    let homePage = new HomePage(data, alias, bio)
    await homePage.goto()

    await use(homePage)

    await homePage.appData.appWindow.close()
    await homePage.appData.app.close()
  },
})

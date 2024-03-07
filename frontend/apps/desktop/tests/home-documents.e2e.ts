import {test} from '../test/fixtures'

test('Onboarding With recovery phrase', async ({homePage}) => {
  // Increased the timeout here to give the gateway a little bit more time to get connected.
  test.setTimeout(60000)
  let {appData, alias} = homePage
  let {appWindow} = appData

  // await expect(await appWindow.getByText(alias)).toBeVisible()
})

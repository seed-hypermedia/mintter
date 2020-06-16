import {
  render,
  screen,
  userEvent,
  waitForLoadingToFinish,
} from 'test/app-test-utils'
import {App} from 'shared/app'

async function renderWelcomeScreen() {
  const route = `/welcome/security-pack`

  const utils = await render(<App />, {route})

  return {
    ...utils,
  }
}

test('Welcome - Security Pack Screen', async () => {
  await renderWelcomeScreen()
})

import {screen, render} from 'test/app-test-utils'
import {App} from 'shared/app'
import * as clientMock from 'shared/mintterClient'

async function renderWelcomeScreen() {
  const utils = await render(<App />, {
    timeout: 10,
  })

  return {
    ...utils,
  }
}

test('Welcome Intro screen', async () => {
  clientMock.getProfile.mockResolvedValue({
    toObject: (): Partial<Profile.AsObject> => ({}),
  })
  await renderWelcomeScreen()

  const startButton = await screen.findByText(/start/i)

  expect(screen.getByText(/Welcome to Mintter!/i)).toBeInTheDocument()
  expect(startButton).toBeInTheDocument()
  expect(startButton).not.toBeDisabled()

  screen.debug()
})

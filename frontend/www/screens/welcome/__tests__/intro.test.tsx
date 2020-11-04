import {render, screen} from 'test/app-test-utils'
import {App} from 'shared/app'

async function renderWelcomeScreen() {
  const route = `/private/welcome`

  const utils = await render(<App />, {route})

  return {
    ...utils,
  }
}

test('Welcome Intro screen', async () => {
  await renderWelcomeScreen()

  const startButton = screen.getByText(/start/i)

  expect(screen.getByText(/Welcome to Mintter!/i)).toBeInTheDocument()
  expect(startButton).toBeInTheDocument()
  expect(startButton).not.toBeDisabled()
})

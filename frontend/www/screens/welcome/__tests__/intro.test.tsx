import {screen} from 'test/app-test-utils'
import {render} from '@testing-library/react'
import WelcomeIntro from '../intro'

async function renderWelcomeScreen() {
  const utils = await render(<WelcomeIntro />)

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

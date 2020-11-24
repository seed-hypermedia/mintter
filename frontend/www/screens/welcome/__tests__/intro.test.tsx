import {screen, render} from 'test/app-test-utils'
import {App} from 'shared/app'
import * as clientMock from 'shared/mintterClient'

jest.mock('shared/mintterClient')

async function renderWelcomeScreen() {
  return await render(<App />, {
    route: '/welcome',
  })
}

test('Welcome Intro screen', async () => {
  clientMock.getProfile.mockImplementation({
    toObject: (): Partial<Profile.AsObject> => ({}),
  })
  await renderWelcomeScreen()

  expect(screen.getByText(/Welcome to Mintter/i)).toBeInTheDocument()
  expect(await screen.findByText(/start/i)).toBeInTheDocument()
  expect(await screen.findByText(/start/i)).not.toBeDisabled()
})

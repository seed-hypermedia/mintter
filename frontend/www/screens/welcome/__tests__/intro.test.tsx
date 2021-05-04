import {screen, render} from 'test/app-test-utils'
import {App} from 'shared/app'

test('Welcome Intro screen', async () => {
  await render(<App />, {
    route: '/welcome',
  })

  expect(screen.getByText(/Welcome to Mintter/i))

  expect(screen.getByText(/start/i)).toBeInTheDocument()
  expect(screen.getByText(/start/i)).not.toBeDisabled()
})

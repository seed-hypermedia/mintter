import * as clientMock from '@mintter/client'
import {render, screen, waitFor} from '../test/app-test-utils'
import {AuthorNode} from '../author-node'

jest.mock('@mintter/client')

describe('<AuthorNode />', () => {
  test('should render the welcome screen if info is not available', async () => {
    ;(clientMock.getInfo as jest.Mock).mockImplementation(() => Promise.reject(new Error('account is not initialized')))

    await render(<AuthorNode />)

    await waitFor(() => {
      expect(screen.queryByText(/Welcome to Mintter/i)).toBeInTheDocument()
    })
  })
})

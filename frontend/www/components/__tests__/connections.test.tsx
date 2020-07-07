import {render, screen, userEvent, act} from 'test/app-test-utils'
import {Connections} from '../connections'
import * as clientMock from 'shared/mintterClient'
import {ListProfilesResponse} from '@mintter/proto/mintter_pb'

jest.mock('shared/mintterClient')

beforeEach(() => {
  clientMock.allConnections.mockResolvedValueOnce({
    toObject: (): ListProfilesResponse.AsObject => ({
      profilesList: [
        {
          connectionStatus: 0,
          username: 'testuser1',
          accountId: 'reallylongaccountidabcd1234',
        },
      ],
    }),
  })
})
test('<Connections />', async () => {
  await render(<Connections />)

  screen.getByText(/connections/i)
  const username = screen.getByText(/testuser1/i)

  await act(() => userEvent.hover(username))

  expect(screen.getByText(/reallylongaccountidabcd1234/i)).toBeInTheDocument()
})

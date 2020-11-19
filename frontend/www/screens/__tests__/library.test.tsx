import {render, screen, waitFor} from 'test/app-test-utils'
import * as clientMock from 'shared/mintterClient'
import {App} from 'shared/app'
import {Profile, SuggestedProfile} from '@mintter/api/v2/mintter_pb'
// import {Profile} from '@mintter/api/v2/mintter_pb'

jest.mock('shared/mintterClient')

beforeEach(() => {
  // clientMock.listConnections.mockResolvedValueOnce({
  //   toObject: (): {profilesList: Profile.AsObject[]} => ({
  //     profilesList: [],
  //   }),
  // })

  clientMock.listSuggestedConnections.mockResolvedValueOnce({
    toObject: (): {profilesList: SuggestedProfile.AsObject[]} => ({
      profilesList: [],
    }),
  })

  clientMock.getProfile.mockResolvedValue({
    toObject: (): Partial<Profile.AsObject> => ({
      peerId: '1234asdf',
      username: 'test-user',
    }),
  })
  clientMock.listDocuments.mockResolvedValue({
    toObject: () => ({
      documentsList: [],
    }),
  })
})

test('renders no suggested connections', async () => {
  await render(<App />, {
    route: '/private/library/feed',
  })

  screen.getByText(/no suggestions available :\(/i)
})

test('renders with Connections', async () => {
  clientMock.listConnections.mockResolvedValueOnce({
    toObject: (): {profilesList: Profile.AsObject[]} => {
      return {
        profilesList: [
          {
            accountId: 'reallylongaccountidabcd1234',
            username: 'testuser',
            connectionStatus: 0,
          },
        ],
      }
    },
  })

  await render(<App />, {
    route: '/private/library/feed',
  })

  await waitFor(() => {
    expect(screen.getByText(/testuser/i)).toBeInTheDocument()
  })
})

import {Publications} from '../publications'
import {render} from 'test/app-test-utils'
import {AppProviders} from '../../components/app-providers'
import * as clientMock from 'shared/mintterClient'
import {Profile} from '@mintter/api/v2/mintter_pb'

jest.mock('shared/mintterClient')

beforeEach(() => {
  clientMock.getProfile.mockResolvedValueOnce({
    toObject: (): Profile.AsObject => ({
      peerId: '1234asdf',
      username: 'test-user',
    }),
  })
  clientMock.listPublications.mockResolvedValueOnce({
    toObject: () => ({
      documentsList: [],
    }),
  })
})

test('should render ', () => {
  render(
    <AppProviders>
      <Publications />
    </AppProviders>,
  )
})

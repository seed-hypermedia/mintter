import {Publications} from '../publications'
import {render} from 'test/app-test-utils'
import {AppProviders} from '../../components/app-providers'
import * as clientMock from 'shared/V1mintterClient'
import {Profile} from '@mintter/proto/mintter_pb'
import {ListPublicationsResponse} from '@mintter/proto/documents_pb'

jest.mock('shared/V1mintterClient')

beforeEach(() => {
  clientMock.getProfile.mockResolvedValueOnce({
    toObject: (): Profile.AsObject => ({
      peerId: '1234asdf',
      username: 'test-user',
    }),
  })
  clientMock.listPublications.mockResolvedValueOnce({
    toObject: (): ListPublicationsResponse.AsObject => ({
      publicationsList: [],
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

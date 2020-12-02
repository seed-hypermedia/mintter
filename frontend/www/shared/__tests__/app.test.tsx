import {App} from '../app'
import {render, screen} from 'test/app-test-utils'
import {buildDocument, buildProfile} from 'test/generate'
import * as mockedIsLocalhost from 'shared/isLocalhost'
import * as clientMock from 'shared/mintterClient'
import {Profile} from '@mintter/api/v2/mintter_pb'
import {Document} from '@mintter/api/v2/documents_pb'

jest.mock('shared/isLocalhost')
jest.mock('shared/mintterClient')

async function renderApp({
  profile,
  listDocuments,
  isLocalhost,
}: {
  profile: Profile.AsObject
  listDocuments: Document.AsObject[]
  isLocalhost: boolean
} = {}) {
  if (profile === undefined) {
    profile = buildProfile()
  }

  clientMock.getProfile.mockResolvedValue({
    toObject: (): Partial<Profile.AsObject> => profile,
  })

  if (listDocuments === undefined) {
    listDocuments = [buildDocument({author: profile ? profile.accountId : ''})]
  }

  clientMock.listDocuments.mockResolvedValue({
    toObject: (): ListDocumentsResponse.AsObject => ({
      documentsList: listDocuments,
    }),
  })

  if (isLocalhost === undefined) {
    isLocalhost = true
  }

  mockedIsLocalhost.isLocalhost.mockReturnValue(isLocalhost)

  const utils = await render(<App />, {route: '/'})

  return {
    ...utils,
    profile,
    listDocuments,
    isLocalhost,
  }
}

describe('Main App', () => {
  test(`should render the Author's Library (AuthorNode's main screen) when the user is at localhost`, async () => {
    mockedIsLocalhost.isLocalhost.mockReturnValue(true)
    await renderApp({isLocalhost: true})
    expect(screen.getByText(/library/i)).toBeInTheDocument()
  })

  test('should render the Public Library (Publisher Node main screen) when the user is NOT at localhost', async () => {
    await renderApp({isLocalhost: false})
    expect(screen.getByText(/articles/i)).toBeInTheDocument()
  })
})

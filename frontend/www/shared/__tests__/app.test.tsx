import {App} from '../app'
import {render, screen} from 'test/app-test-utils'
import {buildDocument, buildProfile} from 'test/generate'
import * as mockedIsLocalhost from 'shared/is-localhost'
import * as clientMock from 'shared/mintter-client'
import {Profile} from '@mintter/api/v2/mintter_pb'
import {Document} from '@mintter/api/v2/documents_pb'

jest.mock('shared/is-localhost.ts')
jest.mock('shared/mintter-client')

async function renderApp({
  profile,
  documentsList,
  isLocalhost,
}: {
  profile: Profile.AsObject
  documentsList: Document.AsObject[]
  isLocalhost: boolean
} = {}) {
  if (profile === undefined) {
    profile = buildProfile()
  }

  clientMock.getProfile.mockResolvedValue({
    toObject: (): Partial<Profile.AsObject> => profile,
  })

  if (documentsList === undefined) {
    documentsList = [
      buildDocument({author: profile ? profile.accountId : ''}),
      buildDocument(),
    ]
  }

  clientMock.listDocuments.mockResolvedValue({
    getDocumentsList: () =>
      documentsList.map(
        (doc: Document.AsObject): Document => ({
          getCreateTime: () => ({
            toDate: () => 12345,
          }),
          toObject: () => doc,
        }),
      ),
  })

  if (isLocalhost === undefined) {
    isLocalhost = true
  }

  mockedIsLocalhost.isLocalhost.mockReturnValue(isLocalhost)

  const utils = await render(<App />, {route: '/'})

  return {
    ...utils,
    profile,
    documentsList,
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
    const {documentsList} = await renderApp({isLocalhost: false})
    expect(screen.getByText(documentsList[0].title)).toBeInTheDocument()
  })
})

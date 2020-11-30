import {render, screen} from 'test/app-test-utils'
import {buildDocument, buildProfile} from 'test/generate'
import * as mockedIsLocalhost from 'shared/isLocalhost'
import * as clientMock from 'shared/mintterClient'
import {Profile} from '@mintter/api/v2/mintter_pb'
import {
  ListDocumentsResponse,
  GetDocumentResponse,
} from '@mintter/api/v2/documents_pb'
import {App} from 'shared/app'

jest.mock('shared/isLocalhost')
jest.mock('shared/mintterClient')
jest.mock('react-modal')

async function renderApp({
  profile,
  listDocuments,
  document,
  isLocalhost,
  route = '/',
  ...renderOptions
} = {}) {
  if (isLocalhost === undefined) {
    isLocalhost = true
  }

  mockedIsLocalhost.isLocalhost.mockReturnValue(isLocalhost)

  if (profile === undefined) {
    profile = buildProfile()
  }

  if (listDocuments === undefined) {
    listDocuments = [buildDocument({author: profile ? profile.accountId : ''})]
  }

  if (document === undefined) {
    document = buildDocument({author: profile ? profile.accountId : ''})
  }

  if (profile !== null) {
    clientMock.getProfile.mockResolvedValue({
      toObject: (): Partial<Profile.AsObject> => profile,
    })

    clientMock.listDocuments.mockResolvedValue({
      toObject: (): ListDocumentsResponse.AsObject => ({
        documentsList: listDocuments,
      }),
    })

    clientMock.getDocument.mockResolvedValue({
      toObject: (): GetDocumentResponse.AsObject => document,
    })
  }

  const utils = await render(<App />, {route, ...renderOptions})

  return {
    ...utils,
    profile,
    listDocuments,
    isLocalhost,
  }
}

describe(`Publisher Node`, () => {
  test('should render the welcome screen when no profile is available', async () => {
    await renderApp({profile: null, listDocuments: null})
    expect(screen.getByText(/Welcome to Mintter/i)).toBeInTheDocument()
  })

  test(`if user lands in "/p/{versionId}" and there's no profile, redirect to the welcome process`, async () => {
    await renderApp({
      profile: null,
      listDocuments: null,
      route: '/p/hello-world-123456789098765432',
    })
    expect(screen.getByText(/Welcome to Mintter/i)).toBeInTheDocument()
  })

  test('should render the public library when profile is available', async () => {
    await renderApp({isLocalhost: false})
    expect(screen.getByText(/Articles/i)).toBeInTheDocument()
  })

  test.only('should render a publication', async () => {
    const {version, title, subtitle} = buildDocument()
    await renderApp({document, route: `/p/${document.version}`})

    // screen.debug(screen.getByTestId('page'))
    // expect(screen.getByText(/Test Document Title/i)).toBeInTheDocument()
    // expect(screen.getByText(/Test Document Subtitle/i)).toBeInTheDocument()
    // expect(screen.getByText(/hello world/i)).toBeInTheDocument()
    console.log(
      '🚀 ~ file: publisher-node.test.tsx ~ line 100 ~ test.only ~ {version, title, subtitle}',
      {version, title, subtitle},
    )
  })

  xtest('should not render the settings page', async () => {
    clientMock.getProfile.mockResolvedValue({
      toObject: (): Partial<Profile.AsObject> => ({
        peerId: '1234asdf',
        username: 'test-user',
        accountId: '123456789098765432',
      }),
    })
    clientMock.listDocuments.mockResolvedValue({
      toObject: (): ListDocumentsResponse.AsObject => ({
        documentsList: [
          {
            version: '123456780987654321',
            title: 'Test Document Title',
            subtitle: 'Test Document Subtitle',
            author: '123456789098765432',
          },
        ],
      }),
    })

    await renderPublisherNode({route: '/settings', timeout: 5000, wait: false})
    expect(screen.getByText(/no route match/i)).toBeInTheDocument()
  })

  xtest('should render the Author Node', async () => {
    clientMock.getProfile.mockResolvedValue({
      toObject: (): Partial<Profile.AsObject> => ({
        peerId: '1234asdf',
        username: 'test-user',
        accountId: '123456789098765432',
      }),
    })
    clientMock.listDocuments.mockResolvedValue({
      toObject: (): ListDocumentsResponse.AsObject => ({
        documentsList: [
          {
            version: '123456780987654321',
            title: 'Test Document Title',
            subtitle: 'Test Document Subtitle',
            author: '123456789098765432',
          },
        ],
      }),
    })

    await renderPublisherNode({route: '/admin'})
    expect(screen.getByText(/library/i)).toBeInTheDocument()
    // screen.debug(screen.getByTestId('app-layout'))
  })
})

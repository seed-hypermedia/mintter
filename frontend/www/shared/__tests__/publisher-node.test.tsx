import {render, screen} from 'test/app-test-utils'
import {buildDocument, buildGetDocument, buildProfile} from 'test/generate'
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

  test('should render a publication', async () => {
    const document = buildGetDocument()
    await renderApp({document, route: `/p/${document.document.version}`})
    const {
      document: {title, subtitle},
      blocksMap,
    } = document
    const blockContent = blocksMap[0][1].paragraph.inlineElementsList[0].text
    // screen.debug(screen.getByTestId('page'))
    expect(screen.getByText(title)).toBeInTheDocument()
    expect(screen.getByText(subtitle)).toBeInTheDocument()
    expect(screen.getByText(blockContent)).toBeInTheDocument()
  })

  test('server: should not render the settings page', async () => {
    await renderApp({route: '/settings', isLocalhost: false, wait: false})

    expect(screen.getByText(/no route match/i)).toBeInTheDocument()
  })

  test('server: should render the User Node', async () => {
    await renderApp({route: '/admin', isLocalhost: false})
    expect(screen.getByText(/library/i)).toBeInTheDocument()
    // screen.debug(screen.getByTestId('app-layout'))
  })
})

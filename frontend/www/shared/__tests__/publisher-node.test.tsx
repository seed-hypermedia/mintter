import {render, screen, waitFor} from '../../test/app-test-utils'
import PublisherNode from '../publisher-node'
import * as clientMock from 'shared/mintterClient'
import {Profile} from '@mintter/api/v2/mintter_pb'
import {
  ListDocumentsResponse,
  GetDocumentResponse,
  BlockRefList,
} from '@mintter/api/v2/documents_pb'

jest.mock('shared/mintterClient')
jest.mock('react-modal')

async function renderPublisherNode({route = '/', ...restConfig} = {}) {
  return await render(<PublisherNode />, {route, ...restConfig})
}

describe(`Publisher Node`, () => {
  test('should render the welcome screen when no profile is available', async () => {
    await renderPublisherNode()
    expect(screen.getByText(/Welcome to Mintter/i)).toBeInTheDocument()
  })

  test(`if user lands in "/p/{versionId}" and there's no profile, redirect to the welcome process`, async () => {
    await renderPublisherNode('/p/hello-world-123456789098765432')
    expect(screen.getByText(/Welcome to Mintter/i)).toBeInTheDocument()
  })

  test('should render the public library when profile is available', async () => {
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
            version: '12345678',
            title: 'Test Document Title',
            subtitle: 'Test Document Subtitle',
            author: '12345678909876543',
          },
        ],
      }),
    })
    await renderPublisherNode()
    expect(screen.getByText(/Articles/i)).toBeInTheDocument()
  })

  test('should render a publication', async () => {
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

    clientMock.getDocument.mockResolvedValue({
      toObject: (): GetDocumentResponse.AsObject => ({
        document: {
          version: '123456780987654321',
          title: 'Test Document Title',
          subtitle: 'Test Document Subtitle',
          author: '123456789098765432',
          blockRefList: {
            style: BlockRefList.Style.NONE,
            refsList: [{ref: 'block-1'}],
          },
        },
        blocksMap: [
          [
            'block-1',
            {
              id: 'block-1',
              quotersList: [],
              paragraph: {
                inlineElementsList: [
                  {
                    text: 'Hello World',
                    textStyle: {
                      bold: false,
                      italic: false,
                      code: false,
                      underline: false,
                    },
                  },
                ],
              },
            },
          ],
        ],
      }),
    })

    await renderPublisherNode({route: '/p/123456780987654321'})

    expect(screen.getByText(/Test Document Title/i)).toBeInTheDocument()
    expect(screen.getByText(/Test Document Subtitle/i)).toBeInTheDocument()
    expect(screen.getByText(/hello world/i)).toBeInTheDocument()
  })

  test('should not render the settings page', async () => {
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

  test('should render the Author Node', async () => {
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

import {render, screen} from 'test/app-test-utils'
import {App} from '../app'
import * as mockedIsLocalhost from 'shared/isLocalhost'
import * as clientMock from 'shared/mintterClient'

jest.mock('shared/isLocalhost')
jest.mock('shared/mintterClient')

describe('Main App', () => {
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
  test(`should render the Author's Library (AuthorNode's main screen) when the user is at localhost`, async () => {
    mockedIsLocalhost.isLocalhost.mockReturnValue(true)
    await render(<App />)
    expect(screen.getByText(/library/i)).toBeInTheDocument()
  })

  test('should render the Public Library (Publisher Node main screen) when the user is NOT at localhost', async () => {
    mockedIsLocalhost.isLocalhost.mockReturnValue(false)
    await render(<App />)
    expect(screen.getByText(/articles/i)).toBeInTheDocument()
  })
})

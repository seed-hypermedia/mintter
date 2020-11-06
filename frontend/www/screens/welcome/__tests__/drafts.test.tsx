import {screen, render, userEvent, act, waitFor} from 'test/app-test-utils'
import Drafts from 'screens/drafts'
import * as clientMock from 'shared/mintterClient'
import {ListDocumentsResponse} from '@mintter/api/v2/documents_pb'

jest.mock('shared/mintterClient')

async function renderDraftsScreen(
  response: ListDocumentsResponse.AsObject = {
    documentsList: [],
  },
) {
  clientMock.listDocuments
    .mockResolvedValue({
      toObject: (): ListDocumentsResponse.AsObject => ({
        documentsList: [],
      }),
    })
    .mockResolvedValueOnce({
      toObject: (): ListDocumentsResponse.AsObject => response,
    })

  clientMock.deleteDocument = jest.fn()
  const utils = await render(<Drafts />)

  return {
    ...utils,
  }
}

test('<Drafts />: Empty drafts', async () => {
  await renderDraftsScreen()

  screen.getByText(/No drafts available/i)
})

test('<Drafts />: Show list of documents', async () => {
  await renderDraftsScreen({
    documentsList: [
      {id: '123', version: 'v123', title: 'Draft Test', author: 'author123'},
    ],
  })
  screen.getByText(/Draft Test/i)
})

test('<Drafts />: Delete Document', async () => {
  global.confirm = () => true
  const draftVersion = 'v123'
  await renderDraftsScreen({
    documentsList: [
      {
        id: '123',
        version: draftVersion,
        title: 'Draft Test',
        author: 'author123',
      },
    ],
  })

  act(() => userEvent.click(screen.getByTestId('delete-button')))

  await waitFor(() => {
    expect(clientMock.deleteDocument).toHaveBeenCalledTimes(1)
    expect(clientMock.deleteDocument).toHaveBeenCalledWith(draftVersion)
  })
})

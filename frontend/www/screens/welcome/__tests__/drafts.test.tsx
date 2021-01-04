import {screen, render, userEvent, act, waitFor} from 'test/app-test-utils'
import Drafts from 'screens/drafts'
import * as clientMock from 'shared/mintter-client'
import {ListDocumentsResponse} from '@mintter/api/v2/documents_pb'
import {buildDocument} from 'test/generate'

jest.mock('shared/mintter-client')

async function renderDraftsScreen({documentsList} = {}) {
  if (documentsList === undefined) {
    documentsList = [buildDocument(), buildDocument(), buildDocument()]
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

  clientMock.deleteDocument = jest.fn()
  const utils = await render(<Drafts />)

  return {
    ...utils,
  }
}

test('<Drafts />: Empty drafts', async () => {
  await renderDraftsScreen({documentsList: []})

  screen.getByText(/No drafts available/i)
})

test('<Drafts />: Show list of documents', async () => {
  const document = buildDocument()
  await renderDraftsScreen({
    documentsList: [document],
  })
  screen.getByText(document.title)
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

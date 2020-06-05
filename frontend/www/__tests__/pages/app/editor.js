import {render, cleanup, waitFor, fireEvent} from '@testing-library/react'
import Editor from 'pages/editor/[documentId]'
// import {Draft} from '@mintter/proto/documents_pb'
import * as nextRouter from 'next/router'
import {RouterContext} from 'next-server/dist/lib/router-context'
import * as mockDrafts from 'shared/drafts'
// jest.mock('shared/drafts', () => {
//   return {
//     ...mockDrafts,
//     // useFetchDraft: () => ({
//     //   status: 'success',
//     //   error: null,
//     //   data: ,
//     // }),
//     getDraftFetcher: () =>
//       Promise.resolve({
//         toObject: () => mockedDraft,
//       }),
//   }
// })

nextRouter.useRouter = jest.fn()
nextRouter.useRouter.mockImplementation(() => ({
  query: {id: `abcde1234`},
}))

afterEach(() => {
  cleanup()
  jest.clearAllMocks()
})

function renderComponent() {
  return render(<Editor />)
}

describe('<Editor />', () => {
  xtest('should not render the section toolbar on first load', async () => {
    window.getSelection = jest.fn(() => {})
    const {queryByTestId, debug} = renderComponent()

    await waitFor(() => {
      expect(queryByTestId(/section-toolbar/i)).not.toBeInTheDocument()
    })
  })

  xtest('should update the title input', async () => {
    const mockedDraft = {
      title: 'mocked draft title',
      description: 'mocked draft description',
      sectionsList: [],
    }
    mockDrafts.getDraftFetcher = jest.fn().mockImplementation(() =>
      Promise.resolve({
        toObject: () => mockedDraft,
      }),
    )
    const {queryByTestId, debug} = renderComponent()

    await await waitFor(async () => {
      const title = queryByTestId('editor_title')
    })

    debug()
  })

  xtest('should autosave content to the database', () => {})

  xtest('should not remove the content editor after refocus', () => {})
})

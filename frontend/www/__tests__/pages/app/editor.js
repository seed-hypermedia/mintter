import {render, cleanup, waitFor, fireEvent} from '@testing-library/react'
import Editor from '../../../pages/app/editor/[id]'
import * as nextRouter from 'next/router'
import {RouterContext} from 'next-server/dist/lib/router-context'

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

  test('should update the title input', async () => {
    const {queryByTestId, debug} = renderComponent()
    await waitFor(async () => {
      // fireEvent.input(queryByTestId('editor_title'), {
      //   target: {value: 'Hello Title'},
      // })

      const title = queryByTestId('editor_title')
    })
  })

  test('should autosave content to the database', () => {})

  test('should not remove the content editor after refocus', () => {})
})

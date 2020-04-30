import {render, cleanup, waitFor} from '@testing-library/react'
import Editor from '../../../pages/app/editor'

afterEach(() => {
  cleanup()
  jest.clearAllMocks()
})

function renderComponent() {
  return render(<Editor />)
}

describe('<Editor />', () => {
  test('should render correctly', async () => {
    window.getSelection = jest.fn(() => {})
    const {queryByTestId} = renderComponent()

    await waitFor(() => {
      expect(queryByTestId(/section-toolbar/i)).not.toBeInTheDocument()
    })
  })
})

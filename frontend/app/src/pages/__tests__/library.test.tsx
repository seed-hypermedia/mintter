import {render, screen, userEvent, waitFor, RenderOptions, RenderResult} from '../../test/app-test-utils'
import {renderLibrary} from '../../test/render-library'
import {Drafts} from '../drafts'
import * as mocks from '@mintter/client/mocks'
import {listDrafts} from '@mintter/client'

afterEach(() => {
  jest.clearAllMocks()
})

describe('<Library />', () => {
  test('should render', async () => {
    const {account} = await renderLibrary()

    // library title page
    expect(screen.queryByText(/Library/i)).toBeInTheDocument()

    // compose button
    expect(screen.queryByRole('button', {name: /compose/i})).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText(account.profile?.alias)).toBeInTheDocument()
      expect(screen.queryByText(account.profile?.bio)).toBeInTheDocument()
    })
  })

  test(`should create a new Draft when 'compose' is clicked`, async () => {
    const {createDraft} = await renderLibrary()

    userEvent.click(screen.queryByRole('button', {name: /compose/i}))
    expect(createDraft).toHaveBeenCalledTimes(1)

    // TODO: add another expectation that checks if the app is now in the editor screen
  })
})

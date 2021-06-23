import {render, screen, userEvent, waitFor, RenderOptions, RenderResult} from '../../test/app-test-utils'
import Library from '../library'
import {Drafts} from '../drafts'
import * as clientMock from '@mintter/client'
import * as mocks from '@mintter/client/mocks'
import {listDrafts} from '@mintter/client'

jest.mock('@mintter/client')

afterEach(() => {
  jest.clearAllMocks()
})

type RenderLibraryOptions = RenderOptions & {
  drafts?: Array<clientMock.Document>
}
type RenderLibraryResult = RenderResult & {
  drafts: Array<clientMock.Document>
}

async function renderLibrary(
  ui: any = <Library />,
  {route = '/library/feed', account, drafts, wait}: RenderLibraryOptions = {},
): RenderLibraryResult {
  account ||= mocks.mockAccount()
  ;(clientMock.getAccount as jest.Mock).mockResolvedValue(account)

  drafts ||= [mocks.mockDocument(), mocks.mockDocument(), mocks.mockDocument()]
  ;(clientMock.listDrafts as jest.Mock).mockResolvedValue({documents: drafts, nextPageToken: 'nextPageToken'})

  const utils = await render(ui, {route, wait})

  return {
    ...utils,
    account,
    drafts,
  }
}

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

  test('should render feed documents', () => {})
  test('should render my published documents', () => {})
  test('should render drafts', async () => {
    const {drafts} = await renderLibrary(<Drafts onCreateDraft={jest.fn()} />, {route: '/library/drafts', wait: true})
    const doc1 = drafts[0]
    await waitFor(() => {
      expect(screen.getByText(doc1.title)).toBeInTheDocument()
    })

    expect(screen.queryByText(/Start your first document/i)).not.toBeInTheDocument()
  })

  test('should render the empty drafts message', async () => {
    await renderLibrary(<Drafts />, {drafts: []})

    await waitFor(() => {
      expect(screen.queryByText(/Start your first document/i)).toBeInTheDocument()
    })
  })

  test(`should create a new Draft when 'compose' is clicked`, async () => {
    ;(clientMock.createDraft as jest.Mock).mockResolvedValue(mocks.mockDocument())
    await renderLibrary()

    userEvent.click(screen.queryByRole('button', {name: /compose/i}))
    expect(clientMock.createDraft).toHaveBeenCalledTimes(1)

    // TODO: add another expectation that checks if the app is now in the editor screen
  })
})

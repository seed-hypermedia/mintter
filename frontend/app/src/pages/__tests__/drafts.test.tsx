import {MemoryRouter, Route} from 'react-router-dom'
import {AppProviders} from '../../app-providers'
import * as clientMock from '@mintter/client'
import {screen, userEvent, waitFor, render} from '../../test/app-test-utils'
import {renderLibrary} from '../../test/render-library'
import {Drafts} from '../drafts'
import Library from '../library'
import {mockDocument} from '@mintter/client/mocks'

jest.mock('@mintter/client')

beforeEach(() => {
  jest.clearAllMocks()
})

test('<Drafts />: should render the empty block when no drafts are returned', async () => {
  mockInfo()
  mockDrafts()
  await render(undefined, {route: '/library/drafts'})

  await waitFor(() => {
    expect(screen.queryByRole('button', {name: /Start your first document/i})).not.toBeInTheDocument()
  })
})

function mockInfo(account: clientMock.Account) {
  ;(clientMock.getInfo as jest.Mock).mockResolvedValue({
    accountId: 'accountId',
    peerId: 'peerId',
  })
}

function mockDrafts(drafts?: Array<clientMock.Document>) {
  drafts ||= [mockDocument(), mockDocument(), mockDocument()]
  ;(clientMock.listDrafts as jest.Mock).mockResolvedValue({
    documents: drafts,
    nextPageToken: 'next',
  } as clientMock.ListDraftsResponse)
}

import * as clientMock from '@mintter/client'
import * as mocks from '@mintter/client/mocks'
import {render, RenderOptions, RenderResult} from './app-test-utils'
import Library from '../pages/library'

jest.mock('@mintter/client')

export type RenderLibraryOptions = RenderOptions & {
  drafts?: Array<clientMock.Document>
  createDraft?: any
}
export type RenderLibraryResult = RenderResult & {
  drafts: Array<clientMock.Document>
}

export async function renderLibrary(
  ui: any,
  {router = {initialEntries: ['/library/feed']}, account, drafts, wait, createDraft}: RenderLibraryOptions = {},
): RenderLibraryResult {
  account ||= mocks.mockAccount()
  ;(clientMock.getAccount as jest.Mock).mockResolvedValue(account)

  drafts ||= [mocks.mockDocument(), mocks.mockDocument(), mocks.mockDocument()]
  ;(clientMock.listDrafts as jest.Mock).mockResolvedValue({documents: drafts, nextPageToken: 'nextPageToken'})
  ;(clientMock.createDraft as jest.Mock).mockResolvedValue(mocks.mockDocument())

  const utils = await render(ui, {router, wait})

  return {
    ...utils,
    account,
    drafts,
    createDraft: clientMock.createDraft,
  }
}

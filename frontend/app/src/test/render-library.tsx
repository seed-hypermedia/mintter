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
  ui: any
  drafts: Array<clientMock.Document>
}

export async function renderLibrary({
  ui,
  route = '/library',
  account,
  info,
  drafts,
  wait,
  createDraft,
  ...rest
}: RenderLibraryOptions = {}): RenderLibraryResult {
  account ||= mocks.mockAccount()
  info ||= {
    accountId: account.id,
    peerId: 'peer',
    startTime: '',
  }
  ;(clientMock.getAccount as jest.Mock).mockResolvedValue(account)
  ;(clientMock.getInfo as jest.Mock).mockResolvedValue(info)

  drafts ||= [mocks.mockDocument(), mocks.mockDocument(), mocks.mockDocument()]
  ;(clientMock.listDrafts as jest.Mock).mockResolvedValue({documents: drafts, nextPageToken: 'nextPageToken'})
  ;(clientMock.createDraft as jest.Mock).mockResolvedValue(mocks.mockDocument())

  const utils = await render(ui, {route, wait, ...rest})

  return {
    ...utils,
    account,
    drafts,
    createDraft: clientMock.createDraft,
  }
}

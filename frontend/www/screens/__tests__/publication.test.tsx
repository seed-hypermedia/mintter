import React from 'react'
import {render, screen, waitFor} from 'test/app-test-utils'
import {App} from 'shared/app'
import * as clientMock from 'shared/mintterClient'
import {buildDocument, buildGetDocument, buildProfile} from 'test/generate'
import {Profile} from '@mintter/api/v2/mintter_pb'
import {Document, GetDocumentResponse} from '@mintter/api/v2/documents_pb'

jest.mock('shared/mintterClient')

async function renderPublication({
  profile,
  document,
}: {
  profile: Profile.AsObject
  document: GetDocumentResponse.AsObject
} = {}) {
  if (profile === undefined) {
    profile = buildProfile()
  }

  clientMock.getProfile.mockResolvedValue({
    toObject: (): Partial<Profile.AsObject> => profile,
  })

  if (document === undefined) {
    document = buildGetDocument()
  }

  clientMock.getDocument.mockResolvedValue({
    toObject: (): GetDocumentResponse.AsObject => document,
  })

  const route = `/p/${document.version}`
  const utils = await render(<App />, {profile, route, timeout: 5000})

  return {
    ...utils,
    profile,
    document,
  }
}

describe('Publication Context menu', () => {
  test('should render a publication', async () => {
    const {document} = await renderPublication()
    // screen.debug(screen.getByTestId('page'))

    expect(screen.getByText(document.document.title)).toBeInTheDocument()
    expect(screen.getByText(document.document.subtitle)).toBeInTheDocument()
    const blockContent =
      document.blocksMap[0][1].paragraph.inlineElementsList[0].text
    expect(screen.getByText(blockContent)).toBeInTheDocument()
  })
})

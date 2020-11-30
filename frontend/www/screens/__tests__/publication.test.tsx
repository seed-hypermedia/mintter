import React from 'react'
import {render, screen} from 'test/app-test-utils'
import {App} from 'shared/app'
import * as clientMock from 'shared/mintterClient'
import {buildDocument, buildProfile} from 'test/generate'
import {Profile} from '@mintter/api/v2/mintter_pb'
import {Document} from '@mintter/api/v2/documents_pb'

jest.mock('shared/mintterClient')

async function renderPublication({
  profile,
  document,
}: {
  profile: Profile.AsObject
  document: Document.AsObject
} = {}) {
  if (profile === undefined) {
    profile = buildProfile()
  }

  clientMock.getProfile.mockResolvedValue({
    toObject: (): Partial<Profile.AsObject> => profile,
  })

  if (document === undefined) {
    document = buildDocument({author: profile ? profile.accountId : ''})
  }

  clientMock.listDocuments.mockResolvedValue({
    toObject: (): ListDocumentsResponse.AsObject => ({
      documentsList: [document],
    }),
  })

  clientMock.getDocument.mockResolvedValue({
    toObject: (): Document.AsObject => document,
  })

  const route = `/p/${document.version}`
  const utils = await render(<App />, {profile, route})

  return {
    ...utils,
    profile,
    document,
  }
}

describe('Publication Context menu', () => {
  xtest('should render', async () => {
    await renderPublication()
  })
})

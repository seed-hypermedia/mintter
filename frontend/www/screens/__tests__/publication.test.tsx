import React from 'react'
import {render, screen} from 'test/app-test-utils'
import {App} from 'shared/app'
import * as clientMock from 'shared/mintterClient'
import {buildDocument, buildUser} from 'test/generate'
import {Profile} from '@mintter/api/v2/mintter_pb'
import {Document} from '@mintter/api/v2/documents_pb'

jest.mock('shared/mintterClient')

async function renderPublication({
  user,
  document,
}: {
  user: Profile.AsObject
  document: Document.AsObject
} = {}) {
  if (user === undefined) {
    user = buildUser()
  }

  clientMock.getProfile.mockResolvedValue({
    toObject: (): Partial<Profile.AsObject> => user,
  })

  if (document === undefined) {
    document = buildDocument({author: user.accountId})
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
  console.log('🚀 ~ file: publication.test.tsx ~ line 43 ~ route', route)
  const utils = await render(<App />, {user, route})

  return {
    ...utils,
    user,
    document,
  }
}

describe('Publication Context menu', () => {
  test('should render', async () => {
    await renderPublication()
    screen.debug(screen.getByTestId('page'))
  })
})

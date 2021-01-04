import React from 'react'
import {screen, render, waitFor} from 'test/app-test-utils'
import {App} from 'shared/app'
import {buildProfile, buildDocument} from 'test/generate'
import * as mockedIsLocalhost from 'shared/is-localhost'
import * as clientMock from 'shared/mintter-client'
import {Profile} from '@mintter/api/v2/mintter_pb'
import {Document} from '@mintter/api/v2/documents_pb'

jest.mock('shared/is-localhost')
jest.mock('shared/mintter-client')

async function renderApp({
  profile,
  listDocuments,
  document,
  isLocalhost,
  route = '/',
  ...renderOptions
}: {
  profile: Profile.AsObject
  listDocuments: Document.AsObject[]
  document: Document.AsObject
  isLocalhost: boolean
  route: string
} = {}) {
  if (isLocalhost === undefined) {
    isLocalhost = true
  }

  mockedIsLocalhost.isLocalhost.mockReturnValue(isLocalhost)

  if (profile === undefined) {
    profile = buildProfile()
  }

  if (listDocuments === undefined) {
    listDocuments = [buildDocument({author: profile ? profile.accountId : ''})]
  }

  if (document === undefined) {
    document = buildDocument({author: profile ? profile.accountId : ''})
  }

  if (profile !== null) {
    clientMock.getProfile.mockResolvedValue({
      toObject: (): Partial<Profile.AsObject> => profile,
    })

    clientMock.listDocuments.mockResolvedValue({
      getDocumentsList: () =>
        listDocuments.map(
          (doc: Document.AsObject): Document => ({
            getCreateTime: () => ({
              toDate: () => 12345,
            }),
            toObject: () => doc,
          }),
        ),
    })

    clientMock.getDocument.mockResolvedValue({
      toObject: (): GetDocumentResponse.AsObject => document,
    })
  }

  const utils = await render(<App />, {route, ...renderOptions})

  return {
    ...utils,
    profile,
    listDocuments,
    isLocalhost,
  }
}
describe('Welcome Redirects', () => {
  test('should redirect to the intro page', async () => {
    await renderApp({route: '/library/feed', profile: null})
    expect(screen.getByText(/Welcome to Mintter/i)).toBeInTheDocument()
  })

  test('should redirect from any welcome step to the library', async () => {
    const {profile} = await renderApp({route: '/welcome/security-pack'})
    // screen.debug(screen.getByTestId('page'))
    expect(screen.getByText(profile.bio)).toBeInTheDocument()
  })
})

import React from 'react'
import {render, screen, waitFor, userEvent, within} from 'test/app-test-utils'
import {App} from 'shared/app'
import * as mockedIsLocalhost from 'shared/isLocalhost'
import * as clientMock from 'shared/mintterClient'
import {
  buildDocument,
  buildDraft,
  buildGetDocument,
  buildProfile,
} from 'test/generate'
import {Profile} from '@mintter/api/v2/mintter_pb'
import {Document, GetDocumentResponse} from '@mintter/api/v2/documents_pb'

jest.mock('shared/mintterClient')
jest.mock('shared/isLocalhost')

async function renderPublication({
  profile,
  document,
  newDraft,
  isLocalhost,
  ...renderOptions
}: {
  profile: Profile.AsObject
  document: GetDocumentResponse.AsObject
  newDraft: Document.AsObject
  isLocalhost: boolean
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

  if (newDraft === undefined) {
    newDraft = buildDraft()
  }

  clientMock.createDraft.mockResolvedValue({
    toObject: (): Document.AsObject => newDraft,
  })

  if (isLocalhost === undefined) {
    isLocalhost = true
  }

  mockedIsLocalhost.isLocalhost.mockReturnValue(isLocalhost)

  const route = `/p/${document.version}`
  const utils = await render(<App />, {
    profile,
    route,
    timeout: 5000,
    ...renderOptions,
  })

  return {
    ...utils,
    profile,
    document,
    newDraft,
  }
}

describe('Publication', () => {
  test('should render a publication', async () => {
    const {document} = await renderPublication()
    // screen.debug(screen.getByTestId('page'))

    expect(screen.getByText(document.document.title)).toBeInTheDocument()
    expect(screen.getByText(document.document.subtitle)).toBeInTheDocument()
    const blockContent =
      document.blocksMap[0][1].paragraph.inlineElementsList[0].text
    expect(screen.getByText(blockContent)).toBeInTheDocument()
  })

  test('localhost: Write about this article', async () => {
    clientMock.setDocument = () => jest.fn()
    await renderPublication({newDraft: buildDraft()})
    // open sidepanel
    userEvent.click(screen.getByText(/interact with this document/i))

    // create a new draft
    userEvent.click(screen.getByText(/write about this article/i))

    await waitFor(() => {
      // screen.debug(screen.getByTestId('page'))
      expect(screen.getByRole('button', {name: /publish/i})).toBeInTheDocument()
    })
  })

  test('server: Write about this article modal', async () => {
    clientMock.setDocument = () => jest.fn()
    await renderPublication({newDraft: buildDraft(), isLocalhost: false})
    // open sidepanel
    userEvent.click(screen.getByText(/interact with this document/i))

    // create a new draft
    userEvent.click(screen.getByText(/write about this article/i))

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', {name: /Publication Modal/i}),
      ).toBeInTheDocument()
      // screen.debug(screen.getByTestId('modal'))
    })
  })

  test('server: Write about this article admin', async () => {
    const saveDocument = jest.fn()
    clientMock.setDocument = () => saveDocument
    const document = buildGetDocument()
    const newDraft = buildDraft()

    await renderPublication({
      newDraft,
      document,
      isLocalhost: false,
      route: `/admin/p/${document.document.version}`,
    })
    // open sidepanel
    userEvent.click(screen.getByText(/interact with this document/i))

    // create a new draft
    userEvent.click(screen.getByText(/write about this article/i))

    await waitFor(() => {
      // the user is in the editor screen
      expect(screen.getByRole('button', {name: /publish/i})).toBeInTheDocument()
      // screen.debug(screen.getByRole('button', {name: /publish/i}))
    })

    // screen.debug(screen.getByTestId('page'))
    const sidePanel = within(
      screen.getByRole('list', {name: 'sidepanel list', exact: false}),
    )

    // check that the previous document is loadded in the sidepanel
    expect(sidePanel.getByText(document.document.title)).toBeVisible()
  })
})

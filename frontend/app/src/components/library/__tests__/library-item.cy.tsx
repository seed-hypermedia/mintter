import {Document, ListDraftsResponse, ListPublicationsResponse, Publication} from '@app/client'
import {queryKeys} from '@app/hooks'
import {MainPageProvider} from '@app/main-page-context'
import {createMainPageMachine} from '@app/main-page-machine'
import {mountWithAccount} from '@app/test/utils'
import {LibraryItem} from '@components/library/library-item'
import {sidepanelMachine, SidepanelProvider} from '@components/sidepanel'
import {useInterpret} from '@xstate/react'
import Sinon from 'cypress/types/sinon'
import {PropsWithChildren} from 'react'
import {QueryClient, setLogger} from 'react-query'

setLogger({
  log: console.log,
  warn: console.warn,
  // ✅ no more errors on the console
  error: () => {
    // noop
  },
})

function MainPageProviders({children, client}: PropsWithChildren<{client: QueryClient}>) {
  const sidepanelService = useInterpret(() => sidepanelMachine)
  const mainPageService = useInterpret(() => createMainPageMachine(client))
  return (
    <MainPageProvider value={mainPageService}>
      <SidepanelProvider value={sidepanelService}>{children}</SidepanelProvider>
    </MainPageProvider>
  )
}

describe('<LibraryItem />', () => {
  beforeEach(() => {
    let {client, render} = mountWithAccount()

    client.setQueryData<ListPublicationsResponse>([queryKeys.GET_PUBLICATION_LIST], {
      publications: [],
      nextPageToken: '',
    })

    client.setQueryData<ListDraftsResponse>([queryKeys.GET_DRAFT_LIST], {
      documents: [],
      nextPageToken: '',
    })

    render(
      <MainPageProviders client={client}>
        <LibraryItem href="/demo" />
      </MainPageProviders>,
    )
  })
  it('default item', () => {
    cy.get('[data-testid="library-item"]').contains('Untitled Document')
  })

  it('should open dropdown element', () => {
    cy.get('[data-testid="library-item"]')
      .get('[data-trigger]')
      .click()
      .get('[data-testid="library-item-dropdown-root"]')
      .should('be.visible')
  })

  it('should Open in Sidepanel', () => {
    cy.get('[data-testid="library-item"]')
      .get('[data-trigger]')
      .click()
      .get('[data-testid="sidepanel-item"]')
      .should('be.visible')
      .contains('Open in sidepanel')
      .click()
  })

  // it('should Open in Main panel', () => {
  //   cy.get('[data-testid="library-item"]')
  //     .get('[data-trigger]')
  //     .click()
  //     .get('[data-testid="mainpanel-item"]')
  //     .should('be.visible')
  //     .contains('Open in main panel')
  //     .click()
  // })
})

describe('<LibraryItem /> with Draft', () => {
  let draft: Document = {
    id: 'testId',
    title: 'test draft title',
    subtitle: 'test subtitle',
    content: '',
    updateTime: undefined,
    createTime: new Date(),
    author: 'testauthor',
    children: [],
    publishTime: undefined,
  }

  let deleteDraft: Cypress.Agent<Sinon.SinonSpy>
  let copyTextToClipboard: Cypress.Agent<Sinon.SinonStub>

  beforeEach(() => {
    let {client, render} = mountWithAccount()

    client.setQueryData<ListPublicationsResponse>([queryKeys.GET_PUBLICATION_LIST], {
      publications: [],
      nextPageToken: '',
    })

    client.setQueryData<ListDraftsResponse>([queryKeys.GET_DRAFT_LIST], {
      documents: [],
      nextPageToken: '',
    })

    deleteDraft = cy.spy()
    copyTextToClipboard = cy.stub()

    render(
      <MainPageProviders client={client}>
        <LibraryItem
          href={`/editor/${draft.id}`}
          deleteDraft={deleteDraft}
          copyTextToClipboard={copyTextToClipboard}
          draft={draft}
        />
      </MainPageProviders>,
    )
  })

  it('should render document title', () => {
    cy.get('[data-testid="library-item"]').contains(draft.title)
  })

  it('should Delete', () => {
    cy.get('[data-testid="library-item"]')
      .get('[data-trigger]')
      .click()
      .get('[data-testid="delete-item"]')
      .click()
      .get('[data-testid="delete-dialog-title"]')
      .should('be.visible')
      .contains('Delete document')
      .get('[data-testid="delete-dialog-cancel"]')
      .should('be.visible')
      .should('be.enabled')
      .get('[data-testid="delete-dialog-confirm"]')
      .should('be.visible')
      .should('be.enabled')
      .click()
      .then(() => {
        expect(deleteDraft).to.have.been.calledOnce
      })
  })

  it('should Copy to Clipboard be disabled on drafts', async () => {
    cy.get('[data-testid="library-item"]')
      .get('[data-trigger]')
      .click()
      .get('[data-testid="copy-item"]')
      .should('be.disabled')
  })
})

describe('<LibraryItem /> with Publication', () => {
  let publication: Publication = {
    version: 'testversion',
    latestVersion: 'testversion',
    document: {
      id: 'testId',
      title: 'test publication title',
      subtitle: 'test subtitle',
      content: '',
      updateTime: undefined,
      createTime: new Date(),
      author: 'testauthor',
      children: [],
      publishTime: undefined,
    },
  }

  let deletePublication: Cypress.Agent<Sinon.SinonSpy>
  let copyTextToClipboard: any

  beforeEach(() => {
    let {client, render} = mountWithAccount()

    client.setQueryData<ListPublicationsResponse>([queryKeys.GET_PUBLICATION_LIST], {
      publications: [],
      nextPageToken: '',
    })

    client.setQueryData<ListDraftsResponse>([queryKeys.GET_DRAFT_LIST], {
      documents: [],
      nextPageToken: '',
    })

    deletePublication = cy.spy()
    copyTextToClipboard = cy.stub().resolves()

    render(
      <MainPageProviders client={client}>
        <LibraryItem
          href={`/p/${publication.document?.id}/${publication.version}`}
          deletePublication={deletePublication}
          copyTextToClipboard={copyTextToClipboard}
          publication={publication}
        />
      </MainPageProviders>,
    )
  })

  it('should render publication title', () => {
    cy.get('[data-testid="library-item"]').contains('test publication title')
  })

  it('should Delete', () => {
    cy.get('[data-testid="library-item"]')
      .get('[data-trigger]')
      .click()
      .get('[data-testid="delete-item"]')
      .click()
      .get('[data-testid="delete-dialog-title"]')
      .should('be.visible')
      .contains('Delete document')
      .get('[data-testid="delete-dialog-cancel"]')
      .should('be.visible')
      .should('be.enabled')
      .get('[data-testid="delete-dialog-confirm"]')
      .should('be.visible')
      .should('be.enabled')
      .click()
      .then(() => {
        expect(deletePublication).to.have.been.calledOnce
      })
  })

  it('should Copy to Clipboard be disabled on drafts', async () => {
    cy.get('[data-testid="library-item"]')
      .get('[data-trigger]')
      .click()
      .get('[data-testid="copy-item"]')
      .click()
      .then(() => {
        expect(copyTextToClipboard).to.have.been.calledOnce
        expect(copyTextToClipboard).to.have.been.calledWith(`mtt://${publication.document.id}/${publication.version}`)
      })
  })
})

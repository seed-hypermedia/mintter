import {Document, Publication} from '@app/client'
import {MINTTER_LINK_PREFIX} from '@app/constants'
import {createDraftMachine} from '@app/draft-machine'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {createPublicationMachine} from '@app/publication-machine'
import {createTestQueryClient} from '@app/test/utils'
import {LibraryItem} from '@components/library/library-item'
import Sinon from 'cypress/types/sinon'
import {spawn} from 'xstate'

describe('<LibraryItem />', () => {
  let publication: Publication = {
    version: 'v1',
    document: {
      id: 'd1',
      title: 'test title',
      subtitle: '',
      children: [],
      author: '',
      updateTime: undefined,
      publishTime: undefined,
      createTime: new Date(),
    },
  }

  let copyTextToClipboard: Cypress.Agent<Sinon.SinonStub>

  beforeEach(() => {
    let {client} = createTestQueryClient({
      publication,
    })
    copyTextToClipboard = cy.stub()

    let editor = buildEditorHook(plugins, EditorMode.Publication)
    cy.mount(
      <LibraryItem
        isNew={false}
        fileRef={spawn(
          createPublicationMachine({client, publication, editor}),
          'pub-d1-v1',
        )}
        copy={copyTextToClipboard}
      />,
      {
        client,
      },
    )
  })
  it('default item', () => {
    cy.get('[data-testid="library-item"]').contains(
      publication.document?.title ?? '',
    )
  })

  it.skip('should open dropdown element', () => {
    /**
     * TODO: we need a real hover event because the trigger element is hidden
     * by CSS (https://github.com/mintterteam/mintter/blob/999f0e806a91b3ca4e76a2d8f79f23abc8f50746/frontend/app/src/components/library/library-item.scss#L25)
     * */
    cy.get('[data-testid="library-item"]')
      .get('[data-trigger]')
      .click({force: true})
      .get('[data-testid="library-item-dropdown-root"]')
      .should('be.visible')
  })

  it('should Copy to Clipboard', () => {
    cy.get('[data-testid="library-item"]')
      .get('[data-trigger]')
      .click()
      .get('[data-testid="copy-item"]')
      .click()
      .then(() => {
        expect(copyTextToClipboard).to.have.been.calledOnce
        expect(copyTextToClipboard).to.have.been.calledWith(
          `${MINTTER_LINK_PREFIX}${publication.document?.id}/${publication.version}`,
        )
      })
  })
})

describe('<LibraryItem /> with Draft', () => {
  let draft: Document = {
    id: 'testId',
    title: 'test draft title',
    subtitle: 'test subtitle',
    updateTime: undefined,
    createTime: new Date(),
    author: 'testauthor',
    children: [],
    publishTime: undefined,
  }

  let deleteDraft: Cypress.Agent<Sinon.SinonSpy>
  let copyTextToClipboard: Cypress.Agent<Sinon.SinonStub>

  beforeEach(() => {
    let {client} = createTestQueryClient({
      draft,
    })

    deleteDraft = cy.spy()
    copyTextToClipboard = cy.stub()

    let editor = buildEditorHook(plugins, EditorMode.Draft)

    cy.mount(
      <LibraryItem
        isNew={false}
        fileRef={spawn(
          createDraftMachine({draft, client, editor, shouldAutosave: false}),
          `draft-${draft.id}`,
        )}
        copy={copyTextToClipboard}
        deleteDraft={deleteDraft}
      />,
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
      .should('have.attr', 'data-disabled')
  })

  it('should show the author label', () => {
    // noop
  })

  it('should show the date label', () => {
    // noop
  })
})

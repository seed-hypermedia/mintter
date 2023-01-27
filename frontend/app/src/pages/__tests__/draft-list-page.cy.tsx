import {Document} from '@mintter/shared'
import {createTestQueryClient} from '@app/test/utils'
import DraftList, {DraftListItem} from '../draft-list-page'
import {Timestamp} from '@bufbuild/protobuf'

// TODO: FIXME
describe('Draft List', () => {
  // TODO: maybe there are two mainServices started here, I'm getting DraftList and PubList queryClient errors (hitting the )
  it('Should show an empty list', () => {
    cy.mount(<DraftList />)
      .get('[data-testid="empty-list-description"]')
      .contains('You have no Drafts yet.')
  })

  it('should render the draft list returned', () => {
    let {client} = createTestQueryClient({
      draftList: [
        {
          id: 'd1',
          title: 'document 1',
          subtitle: '',
          author: 'testauthor',
          createTime: new Timestamp(),
          updateTime: new Timestamp(),
          publishTime: new Timestamp(),
          children: [],
        } as Document,
        {
          id: 'd2',
          title: 'document 2',
          subtitle: '',
          author: 'testauthor',
          createTime: new Timestamp(),
          updateTime: new Timestamp(),
          publishTime: new Timestamp(),
          children: [],
        },
      ],
      authors: [{id: 'testauthor'}],
    })

    cy.mount(<DraftList />, {
      client,
    })
      .get('[data-testid="files-list"]')
      .children()
      .should('have.length', 2)
  })

  describe('Draft list item', () => {
    let draft: Document = {
      id: 'd1',
      title: 'document 1',
      subtitle: '',
      author: 'testauthor',
      createTime: new Timestamp(),
      updateTime: new Timestamp(),
      publishTime: new Timestamp(),
      children: [],
    }

    it('should render all the content', () => {
      let {client} = createTestQueryClient({
        draft,
        authors: [{id: 'testauthor'}],
      })
      let setLocation = cy.stub()

      cy.mount(<DraftListItem draft={draft} />, {
        client,
        setLocation,
      })
        .get('[data-testid="list-item-title"]')
        .contains(draft.title)
        .get('[data-testid="list-item-date"]')
        .contains('Jan 1, 1970')
    })

    it('should navigate to draft', () => {
      let {client} = createTestQueryClient({
        draft,
        authors: [{id: 'testauthor'}],
      })
      let setLocation = cy.spy()

      cy.mount(<DraftListItem draft={draft} />, {
        setLocation,
        client,
      })
        .get('[data-testid="list-item-title"]')
        .click()
        .get('[data-testid="list-item-date"]')
        .click()
        .then(() => {
          expect(setLocation).to.be.calledTwice
          expect(setLocation.args).to.deep.equal([['/d/d1'], ['/d/d1']])
        })
    })

    it('should open in the same window', () => {
      let setLocation = cy.spy()
      let {client} = createTestQueryClient({
        draft,
        authors: [{id: 'testauthor'}],
      })
      cy.mount(<DraftListItem draft={draft} />, {
        client,
        setLocation,
      })
        .get('[data-trigger]')
        .click({force: true})
        .get('[data-testid="open-item"]')
        .click()
        .then(() => {
          // TODO: get the clipboard value from the system
          expect(setLocation).to.have.been.calledOnceWith('/d/d1')
        })
    })

    it('should open in a new window', () => {
      let {client} = createTestQueryClient({
        draft,
        authors: [{id: 'testauthor'}],
      })
      cy.mount(<DraftListItem draft={draft} />, {
        client,
      })
        .get('[data-trigger]')
        .click({force: true})
        .get('[data-testid="open-item"]')
        .click()
        .then(() => {
          // TODO: mock the window function (maybe mock the mainService event)
        })
    })

    it('should delete', () => {
      let {client} = createTestQueryClient({
        draft,
        authors: [{id: 'testauthor'}],
      })
      cy.mount(<DraftListItem draft={draft} />, {
        client,
      })
        .get('[data-trigger]')
        .click({force: true})
        .get('[data-testid="delete-item"]')
        .click()
        .then(() => {
          // TODO: mock the window function (maybe mock the mainService event)
        })
    })
  })
})

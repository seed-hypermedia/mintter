import {FileList} from '@components/file-list'

// TODO: FIXME
describe('<FileList />', () => {
  // TODO: maybe there are two mainServices started here, I'm getting DraftList and PubList queryClient errors (hitting the )
  it('create new draft buttons work', () => {
    let newBtn = cy.stub()

    cy.mount(
      <FileList
        title="test title"
        items={[]}
        emptyLabel="empty label"
        handleNewDraft={newBtn}
        handleNewWindow={newBtn}
      />,
    )
      .get('[data-testid="filelist-title"]')
      .contains('test title')
      .get('[data-testid="filelist-empty-label"]')
      .contains('empty label')
      .get('[data-testid="filelist-new-button"]')
      .click()
      .then(() => {
        expect(newBtn).callCount(1)
      })
  })
})

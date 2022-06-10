import {Account, Document} from '@app/client'
import {queryKeys} from '@app/hooks'
import {mountProviders} from '@app/test/utils'
import {Topbar} from '@components/topbar'

describe('Topbar', () => {
  it('default render', () => {
    let {render, client} = mountProviders()
    render(<Topbar />)
  })

  it.skip('render Draft Title and Author', () => {
    let {render, client} = mountProviders()
    let date = new Date()

    let draft: Document = {
      id: 'foo',
      title: 'test demo',
      subtitle: 'test subtitle',
      author: 'authortest',
      content: '',
      updateTime: date,
      createTime: date,
      publishTime: date,
      children: [],
    }

    let author: Account = {
      id: 'authortest',
      profile: {
        alias: 'test demo user',
        email: 'demo@demo.com',
        bio: 'demo',
      },
      devices: {
        d1: {
          peerId: 'd1',
        },
      },
    }

    client.setQueryData<Document>([queryKeys.GET_DRAFT, 'foo'], draft)

    client.setQueryData<Account>([queryKeys.GET_ACCOUNT, 'authortest'], author)

    render(<Topbar />)
      .get('[data-testid="topbar-title"]')
      .contains(draft.title)
      .get('[data-testid="topbar-author"]')
      .contains(author.profile!.alias)
  })

  it('navigation button should work', () => {
    let {render} = mountProviders()
    let back = cy.stub()
    let forward = cy.stub()
    render(<Topbar />)
      .get("[data-testid='history-back']")
      .click()
      .get("[data-testid='history-forward']")
      .click()
      .then(() => {
        expect(back).to.have.been.calledOnce
        expect(forward).to.have.been.calledOnce
      })
  })
})

import {Account, Document} from '@app/client'
import {blockToApi} from '@app/client/v2/block-to-api'
import {changesService} from '@app/editor/mintter-changes/plugin'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {queryKeys} from '@app/hooks'
import EditorPage from '@app/pages/editor'
import {MainPageProviders, mountWithAccount} from '@app/test/utils'
import {GroupingContent, paragraph, statement, text} from '@mintter/mttast'
import {QueryClient} from 'react-query'

describe('Statement Plugin', () => {
  let elClient: QueryClient
  let elRender: any

  beforeEach(() => {
    const {client, render} = mountWithAccount()
    let date = new Date()

    let block = statement({id: 'block1'}, [paragraph([text('Hello World')])])

    client.setQueryData<Document>([queryKeys.GET_DRAFT, 'foo'], {
      id: 'foo',
      title: '',
      subtitle: '',
      author: 'authortest',
      content: '',
      updateTime: date,
      createTime: date,
      publishTime: date,
      children: [
        {
          block: blockToApi(block),
          children: [],
        },
      ],
    })

    client.setQueryData<Account>([queryKeys.GET_ACCOUNT, 'authortest'], {
      id: 'authortest',
      profile: {
        alias: 'demo',
        email: 'demo@demo.com',
        bio: 'demo',
      },
      devices: {
        d1: {
          peerId: 'd1',
        },
      },
    })

    changesService.reset()
    elClient = client
    elRender = render
  })
  it('should keep id + content united', () => {
    let elEditor = buildEditorHook(plugins, EditorMode.Draft)
    elRender(
      <MainPageProviders
        client={elClient}
        mainPageContext={{params: {docId: 'foo'}}}
      >
        <EditorPage editor={elEditor} shouldAutosave={false} />
      </MainPageProviders>,
    )

    cy.get('[data-testid="editor"]')
      .focus()
      .then(() => {
        elEditor.apply({
          type: 'set_selection',
          properties: null,
          newProperties: {
            anchor: {
              path: [0, 0, 0, 0],
              offset: 0,
            },
            focus: {
              path: [0, 0, 0, 0],
              offset: 0,
            },
          },
        })
      })
      .type('{enter}')
      .then(() => {
        let [b1, b2] = (elEditor.children[0] as GroupingContent).children
        expect(b2.id).to.be.equal('block1')
      })
  })
})

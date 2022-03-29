import { Account, Document } from '@app/client'
import { buildEditorHook, EditorMode } from '@app/editor/plugin-utils'
import { plugins } from '@app/editor/plugins'
import { queryKeys } from '@app/hooks'
import EditorPage from '@app/pages/editor'
import { MainPageProviders, mountWithAccount } from '@app/test/utils'

describe('Editor Page', () => {
  it('Hello world', () => {
    const { client, render } = mountWithAccount()
    let date = new Date()

    client.setQueryData<Document>([queryKeys.GET_DRAFT, 'foo'], {
      id: 'foo',
      title: 'test demo',
      subtitle: 'test subtitle',
      author: 'authortest',
      content: '',
      updateTime: date,
      createTime: date,
      publishTime: date,
      children: [],
    })

    client.setQueryData<Account>([queryKeys.GET_ACCOUNT, 'authortest'], {
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
    })

    let elEditor = buildEditorHook(plugins, EditorMode.Draft)
    render(
      <MainPageProviders client={client}>
        <EditorPage params={{ docId: 'foo', blockId: 'block' }} editor={elEditor} />
      </MainPageProviders>,
    )

    let editor = cy.get('[data-testid="editor"]')
    editor.focus()

    // editor.type(' ').type('Hello World{enter}').tab()
    editor
      .type(' ') // need to type this because if not the first letter is not typed 🤷🏼‍♂️
      .type('Hello World')
  })
})

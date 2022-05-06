import {Account, Document, Publication} from '@app/client'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {queryKeys} from '@app/hooks'
import EditorPage from '@app/pages/editor'
import {MainPageProviders, mountWithAccount} from '@app/test/utils'

describe('Editor Page', () => {
  it('should publish a draft', () => {
    const {client, render} = mountWithAccount()
    let date = new Date()

    let publication: Publication = {
      version: '1',
      latestVersion: '1',
      document: {
        id: 'foo',
        title: 'test demo',
        subtitle: 'test subtitle',
        author: 'authortest',
        content: '',
        updateTime: date,
        createTime: date,
        publishTime: date,
        children: [],
      },
    }

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

    client.setQueryData<Document>([queryKeys.GET_DRAFT, 'foo'], draft)

    client.setQueryData<Publication>(
      [queryKeys.GET_PUBLICATION, 'foo', 1],
      publication,
    )

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
    let publishDraft = cy.stub().resolves(publication)
    let updateDraft = cy.stub().resolves(true)
    render(
      <MainPageProviders
        client={client}
        mainPageContext={{
          params: {docId: 'foo', blockId: 'block', version: null},
          document: draft,
        }}
      >
        <EditorPage
          editor={elEditor}
          updateDraft={updateDraft}
          publishDraft={publishDraft}
          // shouldAutosave={false}
        />
      </MainPageProviders>,
    )

    let editor = cy.get('[data-testid="editor"]')
    editor.focus()

    editor
      .type(' ') // need to type this because if not the first letter is not typed 🤷🏼‍♂️
      .type('Hello World')
      .wait(1000)
      .get('[data-testid="submit-publish"]')
      .click()
      .then(() => {
        expect(updateDraft).to.have.been.calledOnce
        expect(publishDraft).to.have.been.calledOnce
      })
  })
})

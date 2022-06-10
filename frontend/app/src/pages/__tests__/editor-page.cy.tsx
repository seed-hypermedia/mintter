import {App} from '@app/app'
import {Document, Publication} from '@app/client'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import EditorPage from '@app/pages/editor'
import {mountProviders} from '@app/test/utils'

describe('Editor Page', () => {
  it.only('should render Draft', () => {
    let date = new Date()
    let draft: Document = {
      id: 'foo',
      title: 'test demo',
      subtitle: 'test subtitle',
      author: '',
      content: '',
      updateTime: date,
      createTime: date,
      publishTime: date,
      children: [],
    }
    const {render} = mountProviders({
      initialRoute: '/editor/foo',
      draft,
    })

    render(<App />)
  })

  it('should publish a draft', () => {
    let date = new Date()
    let publication: Publication = {
      version: '1',
      document: {
        id: 'foo',
        title: 'test demo',
        subtitle: 'test subtitle',
        author: '',
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
      author: '',
      content: '',
      updateTime: date,
      createTime: date,
      publishTime: date,
      children: [],
    }
    const {client, render} = mountProviders({
      initialRoute: '/editor/foo',
      publication,
      draft,
    })

    let elEditor = buildEditorHook(plugins, EditorMode.Draft)
    let publishDraft = cy.stub().resolves(publication)
    let updateDraft = cy.stub().resolves(true)
    render(
      <EditorPage
        editor={elEditor}
        updateDraft={updateDraft}
        publishDraft={publishDraft}
        // shouldAutosave={false}
      />,
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

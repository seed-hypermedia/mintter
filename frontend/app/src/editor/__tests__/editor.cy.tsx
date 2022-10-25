import {Document, Publication} from '@app/client'
import {blockToApi} from '@app/client/v2/block-to-api'

import {ChangeOperation} from '@app/editor/mintter-changes/plugin'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {
  FlowContent,
  GroupingContent,
  heading,
  link,
  paragraph,
  statement,
  staticParagraph,
  text,
} from '@app/mttast'
import {createTestDraft, createTestQueryClient} from '@app/test/utils'
import {Route} from '@components/router'
import {Editor as EditorType} from 'slate'

import {ListCitationsResponse} from '@app/client/.generated/documents/v1alpha/documents'
import {queryKeys} from '@app/hooks'
import {mouseMachine} from '@app/mouse-machine'
import {Group} from '@app/mttast'
import DraftPage from '@app/pages/draft'
import {InterpreterFrom} from 'xstate'

before(() => {
  window.__TAURI_IPC__ = function () {
    // noop
  }
})

describe('Editor', () => {
  describe('Move Operations', () => {
    it('should add the default block', () => {
      let {client, draft} = createTestQueryClient({
        draft: createTestDraft(),
      })

      let editor = buildEditorHook(plugins, EditorMode.Draft)

      cy.mount(<TestEditor editor={editor} />, {
        client,
        path: `/d/${draft?.id}`,
      })
        .get('[data-testid="editor"]')
        .then(() => {
          expect(editor.__mtt_changes).to.have.length(2)
        })
    })

    it('should move to the correct parent when enter from a heading block', () => {
      let block = heading({id: 'b1'}, [staticParagraph([text('Hello World')])])
      let draft = createTestDraft({
        children: [
          {
            block: blockToApi(block),
            children: [],
          },
        ],
      })
      let editor = buildEditorHook(plugins, EditorMode.Draft)

      let {client} = createTestQueryClient({
        draft,
      })
      cy.mount(<TestEditor editor={editor} />, {
        client,
        path: `/d/${draft.id}`,
      })
        // .wait(100)
        .get('[data-testid="editor"]')
        .then(() => {
          editor.apply({
            type: 'set_selection',
            properties: null,
            newProperties: {
              anchor: {
                path: [0, 0, 0, 0],
                offset: 11,
              },
              focus: {
                path: [0, 0, 0, 0],
                offset: 11,
              },
            },
          })
        })
        .type('{enter}')
        .then(() => {
          let changes = editor.__mtt_changes
          let newBlock = (editor.children[0] as Group).children[0]
            ?.children?.[1]?.children[0] as FlowContent
          expect(changes).to.have.lengthOf.greaterThan(2)
          let expected: ChangeOperation = ['moveBlock', newBlock.id]
          expect(changes).to.deep.include(expected)
        })
    })

    it('should respect block id when pressing escape in the beginning of a block AND the previous block is empty', () => {
      let block1 = statement({id: 'b1'}, [paragraph([text('')])])
      let block2 = statement({id: 'b2'}, [paragraph([text('move this block')])])

      let editor = buildEditorHook(plugins, EditorMode.Draft)

      let {client, draft} = createTestQueryClient({
        draft: createTestDraft({
          children: [
            {
              block: blockToApi(block1),
              children: [],
            },
            {
              block: blockToApi(block2),
              children: [],
            },
          ],
        }),
      })

      cy.mount(<TestEditor editor={editor} />, {
        client,
        path: `/d/${draft.id}`,
      })
        .get('[data-testid="editor"]')
        .focus()
        .then(() => {
          editor.apply({
            type: 'set_selection',
            properties: null,
            newProperties: {
              anchor: {
                path: [0, 1, 0, 0],
                offset: 0,
              },
              focus: {
                path: [0, 1, 0, 0],
                offset: 0,
              },
            },
          })
        })
        .type('{backspace}')
        .then(() => {
          let changes = editor.__mtt_changes
          expect(changes).to.have.length(1)
          expect(changes).to.deep.include(['deleteBlock', block1.id])
        })
    })

    it('should add new block after press enter', () => {
      let block = statement({id: 'b1'}, [paragraph([text('Hello World')])])

      let editor = buildEditorHook(plugins, EditorMode.Draft)
      let {client, draft} = createTestQueryClient({
        draft: createTestDraft({
          children: [
            {
              block: blockToApi(block),
              children: [],
            },
          ],
        }),
      })

      cy.mount(<TestEditor editor={editor} />, {
        client,
        path: `/d/${draft?.id}`,
      })
        .wait(300)
        .get('[data-testid="editor"]')
        .then(() => {
          editor.apply({
            type: 'set_selection',
            properties: null,
            newProperties: {
              anchor: {
                path: [0, 0, 0, 0],
                offset: 11,
              },
              focus: {
                path: [0, 0, 0, 0],
                offset: 11,
              },
            },
          })
        })
        .type('{enter}')
        .then(() => {
          let changes = editor.__mtt_changes
          let newBlock: FlowContent = (editor.children[0] as GroupingContent)
            .children[1]
          expect(changes).to.have.lengthOf.greaterThan(2)
          let expected: ChangeOperation = ['moveBlock', newBlock.id]
          expect(changes).to.deep.include(expected)
        })
    })

    it.skip('re-parent block and siblings (tab + shift)', () => {
      // TODO(horacio)
    })
    it.skip('should add a link to the current selected text', () => {
      // TODO(horacio)
    })
    it.skip('should add a Mintter link to the current selected text', () => {
      // TODO(horacio)
    })
  })

  describe('Delete Operations', () => {
    it('should delete one block', () => {
      let block1 = statement({id: 'b1'}, [paragraph([text('Parent block')])])
      let block2 = statement({id: 'b2'}, [paragraph([text('')])])

      let editor = buildEditorHook(plugins, EditorMode.Draft)

      let {client, draft} = createTestQueryClient({
        draft: createTestDraft({
          children: [
            {
              block: blockToApi(block1),
              children: [],
            },
            {
              block: blockToApi(block2),
              children: [],
            },
          ],
        }),
      })

      cy.mount(<TestEditor editor={editor} />, {
        client,
        path: `/d/${draft?.id}`,
      })
        .wait(100)
        .get('[data-testid="editor"]')
        .then(() => {
          editor.apply({
            type: 'set_selection',
            properties: null,
            newProperties: {
              anchor: {
                path: [0, 1, 0, 0],
                offset: 0,
              },
              focus: {
                path: [0, 1, 0, 0],
                offset: 0,
              },
            },
          })
        })
        .type('{backspace}')
        .then(() => {
          let changes = editor.__mtt_changes
          expect(changes.length).to.be.greaterThan(1)
          let expected: ChangeOperation = ['deleteBlock', 'b2']
          expect(changes).to.deep.include(expected)
        })
    })

    it.skip('delete block with descendants', () => {
      // noop
      /**
       * initial:
       * - b1('Parent block')
       * - <CURSOR>b2('')
       *   - b3('reparent me when delete b2')
       *
       * output:
       * - b1<CURSOR>
       * - b3
       */
    })
  })

  describe('Replace Operations', () => {
    it('should add after editing empty block', () => {
      let block = statement({id: 'b1'}, [paragraph([text('')])])

      let draft: Document = {
        id: 'foo',
        title: 'demo',
        subtitle: '',
        children: [
          {
            block: blockToApi(block),
            children: [],
          },
        ],
        createTime: new Date(),
        updateTime: new Date(),
        author: '',
        publishTime: undefined,
      }

      let editor = buildEditorHook(plugins, EditorMode.Draft)

      let {client} = createTestQueryClient({
        draft,
      })

      cy.mount(<TestEditor editor={editor} />, {
        client,
        path: `/d/${draft.id}`,
      })
        .get('[data-testid="editor"]')
        .type(' ') // need to type this because if not the first letter is not typed ¯\_(ツ)_/¯
        .type('Hello World')
        .then(() => {
          let changes = editor.__mtt_changes
          expect(changes).to.have.length(1)
          let expected: ChangeOperation = ['replaceBlock', 'b1']
          expect(changes).to.deep.include(expected)
        })
    })

    it('should add after adding content to an existing block', () => {
      let block = statement({id: 'b1'}, [paragraph([text('Hello World')])])

      let draft: Document = {
        id: 'foo',
        title: 'demo',
        subtitle: '',
        children: [
          {
            block: blockToApi(block),
            children: [],
          },
        ],
        createTime: new Date(),
        updateTime: new Date(),
        author: '',
        publishTime: undefined,
      }

      let editor = buildEditorHook(plugins, EditorMode.Draft)

      let {client} = createTestQueryClient({
        draft,
      })

      cy.mount(<TestEditor editor={editor} />, {
        client,
        path: `/d/${draft.id}`,
      })
        .get('[data-testid="editor"]')
        .then(() => {
          editor.apply({
            type: 'set_selection',
            properties: null,
            newProperties: {
              anchor: {
                path: [0, 0, 0, 0],
                offset: 11,
              },
              focus: {
                path: [0, 0, 0, 0],
                offset: 11,
              },
            },
          })
        })
        .type('. mote text.') // need to type this because if not the first letter is not typed ¯\_(ツ)_/¯
        .then(() => {
          let changes = editor.__mtt_changes
          expect(changes).to.have.length(1)
          let expected: ChangeOperation = ['replaceBlock', 'b1']
          expect(changes).to.deep.include(expected)
        })
    })

    it.skip('should add when block type changes', () => {
      // TODO: need to figure out how to test this properly. I can't make the blocktools appear on the screen (yet)
      let block = heading({id: 'b1'}, [staticParagraph([text('Hello World')])])

      let draft: Document = {
        id: 'foo',
        title: 'demo',
        subtitle: '',
        children: [
          {
            block: blockToApi(block),
            children: [],
          },
        ],
        createTime: new Date(),
        updateTime: new Date(),
        author: '',
        publishTime: undefined,
      }

      let editor = buildEditorHook(plugins, EditorMode.Draft)

      let {client} = createTestQueryClient({
        draft,
      })

      cy.mount(<TestEditor editor={editor} />, {
        client,
        path: `/d/${draft.id}`,
      })
        .get('[data-block-id="b1"]')
        // .wait(500)
        .then(() => {
          ;(window.mouseService as InterpreterFrom<typeof mouseMachine>).send({
            type: 'MOUSE.MOVE',
            position: 40,
          })
        })
        .get('[data-testid="blocktools-trigger"]')
        // .should('be.visible')
        .click({force: true})
        .get('[data-testid="item-Statement"]')
        .click()
        .then(() => {
          let changes = editor.__mtt_changes
          expect(changes).to.have.length(1)
          let expected: ChangeOperation = ['replaceBlock', 'b1']
          expect(changes).to.deep.include(expected)
        })
    })

    it('should add link block to changes', () => {
      let block = statement({id: 'b1'}, [paragraph([text('Hello World')])])

      let draft: Document = {
        id: 'foo',
        title: 'demo',
        subtitle: '',
        children: [
          {
            block: blockToApi(block),
            children: [],
          },
        ],
        createTime: new Date(),
        updateTime: new Date(),
        author: '',
        publishTime: undefined,
      }

      let editor = buildEditorHook(plugins, EditorMode.Draft)

      let {client} = createTestQueryClient({
        draft,
      })

      cy.mount(<TestEditor editor={editor} />, {
        client,
        path: `/d/${draft.id}`,
      })
        .wait(100)
        .get('[data-testid="editor"]')
        .then(() => {
          // TODO: for some reason this selection is not applied correctly to the editor? cc @jonas
          editor.apply({
            type: 'set_selection',
            properties: null,
            newProperties: {
              anchor: {
                path: [0, 0, 0, 0],
                offset: 6,
              },
              focus: {
                path: [0, 0, 0, 0],
                offset: 11,
              },
            },
          })
        })
        .get('[data-testid="toolbar-link-button"]')
        .click()
        .get('[data-testid="modal-link-remove-button"]')
        .should('be.disabled')
        .get('[data-testid="modal-link-input"]')
        .type('https://mintter.com')
        .get('[type="submit"]')
        .click()
        .then(() => {
          let changes = editor.__mtt_changes
          expect(changes).to.have.lengthOf.greaterThan(1)

          let expected: ChangeOperation = ['replaceBlock', 'b1']

          expect(changes).to.deep.include(expected)
        })
    })

    it('should remove link block to changes', () => {
      let block = statement({id: 'b1'}, [
        paragraph([
          text('Hello '),
          link({url: 'https://mintter.com'}, [text('Mintter')]),
        ]),
      ])

      let editor = buildEditorHook(plugins, EditorMode.Draft)

      let {client, draft} = createTestQueryClient({
        draft: createTestDraft({
          children: [
            {
              block: blockToApi(block),
              children: [],
            },
          ],
        }),
      })

      cy.mount(<TestEditor editor={editor} />, {
        client,
        path: `/d/${draft?.id}`,
      })
        .wait(100)
        .get('[data-testid="editor"]')
        .then(() => {
          editor.apply({
            type: 'set_selection',
            properties: null,
            newProperties: {
              anchor: {
                path: [0, 0, 0, 1, 0],
                offset: 0,
              },
              focus: {
                path: [0, 0, 0, 1, 0],
                offset: 5,
              },
            },
          })
        })
        .get('[data-testid="toolbar-link-button"]')
        .click()
        .get('[data-testid="modal-link-remove-button"]')
        .click()
        .then(() => {
          let changes = editor.__mtt_changes
          expect(changes).to.have.lengthOf.greaterThan(1)
          let expected: ChangeOperation = ['replaceBlock', 'b1']
          expect(changes).to.deep.include(expected)
        })
    })
  })
})

describe('Links', () => {
  it('should add a Document Link with title', () => {
    let block = statement({id: 'b1'}, [paragraph([text('')])])
    let title = 'Demo title'

    let draft: Document = {
      id: 'foo',
      title: 'demo',
      subtitle: '',
      children: [
        {
          block: blockToApi(block),
          children: [],
        },
      ],
      createTime: new Date(),
      updateTime: new Date(),
      author: '',
      publishTime: undefined,
    }

    let publication: Publication = {
      version: 'v1',
      document: {
        id: 'd1',
        author: 'demoauthor',
        title,
        subtitle: '',
        createTime: undefined,
        updateTime: undefined,
        publishTime: undefined,
        children: [],
      },
    }

    let editor = buildEditorHook(plugins, EditorMode.Draft)

    let {client} = createTestQueryClient({
      publication,
      publicationList: [publication],
      draft,
      authors: [{id: 'demoauthor'}],
    })

    cy.mount(<TestEditor editor={editor} />, {
      client,
      path: `/d/${draft.id}`,
    })
      .get('[data-testid="editor"]')
      .click()
      .then(() => {
        let data = new DataTransfer()
        data.setData('text', 'mintter://d1/v1')
        editor.insertData(data)
      })
      .contains(title)
  })
})

describe('Transclusions', () => {
  it('should paste a transclusion into the editor', () => {
    let blockContent = 'Hello b1'
    let block = statement({id: 'b1'}, [paragraph([text(blockContent)])])
    let publication: Publication = {
      version: 'v1',
      document: {
        id: 'd1',
        title: 'Document title test',
        author: 'authorid',
        subtitle: '',
        children: [
          {
            block: blockToApi(block),
            children: [],
          },
        ],
        createTime: new Date(),
        updateTime: new Date(),
        publishTime: new Date(),
      },
    }

    let draft: Document = {
      id: 'foo',
      title: 'demo',
      subtitle: '',
      children: [],
      createTime: new Date(),
      updateTime: new Date(),
      author: 'testauthor',
      publishTime: undefined,
    }

    let {client} = createTestQueryClient({
      publicationList: [publication],
      publication,
      draftList: [draft],
      draft,
      authors: [{id: 'testauthor'}, {id: 'authorid'}],
      url: `/p/d1/v1`,
    })

    client.setQueryData<ListCitationsResponse>(
      [queryKeys.GET_PUBLICATION_DISCUSSION, 'd1', 'v1'],
      {
        links: [],
      },
    )

    let editor = buildEditorHook(plugins, EditorMode.Draft)

    cy.mount(<TestEditor editor={editor} />, {
      client,
      path: `/d/${draft.id}`,
    })
      .get('[data-testid="editor"]')
      .then(() => {
        editor.apply({
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
      .paste({pastePayload: 'mintter://d1/v1/b1', pasteType: 'text'})
      .contains(blockContent)
  })
})

type TestEditorProps = {
  editor: EditorType
}

function TestEditor({editor}: TestEditorProps) {
  return (
    <Route path="/d/:id">
      {() => <DraftPage shouldAutosave={false} editor={editor} />}
    </Route>
  )
}

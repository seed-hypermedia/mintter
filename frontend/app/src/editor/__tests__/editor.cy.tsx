import {Document, Publication} from '@app/client'
import {blockToApi} from '@app/client/v2/block-to-api'
import {createDraftMachine} from '@app/draft-machine'
import {Editor} from '@app/editor/editor'
import {ChangeOperation} from '@app/editor/mintter-changes/plugin'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {FileProvider} from '@app/file-provider'
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
import {createTestQueryClient} from '@app/test/utils'
import {useActor, useInterpret} from '@xstate/react'
import {useEffect} from 'react'
import {QueryClient} from '@tanstack/react-query'
import {Editor as EditorType} from 'slate'

import {ListCitationsResponse} from '@app/client/.generated/documents/v1alpha/documents'
import {BlockTools} from '@app/editor/block-tools'
import {BlockToolsProvider} from '@app/editor/block-tools-context'
import {blockToolsMachine} from '@app/editor/block-tools-machine'
import {queryKeys} from '@app/hooks'
import {Group} from '@app/mttast'
import {InterpreterFrom} from 'xstate'

before(() => {
  window.__TAURI_IPC__ = function () {
    // noop
  }
})

describe('Editor', () => {
  describe('Move Operations', () => {
    it('should add the default block', () => {
      let draft: Document = {
        id: 'foo',
        title: 'demo',
        subtitle: '',
        children: [],
        createTime: new Date(),
        updateTime: new Date(),
        author: '',
        publishTime: undefined,
      }

      let editor = buildEditorHook(plugins, EditorMode.Draft)
      let {client} = createTestQueryClient({
        draft,
      })

      cy.mount(<TestEditor editor={editor} client={client} draft={draft} />)

      cy.get('[data-testid="editor"]').then(() => {
        expect(editor.__mtt_changes).to.have.length(2)
      })
    })

    it('should move to the correct parent when enter from a heading block', () => {
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
      cy.mount(<TestEditor editor={editor} client={client} draft={draft} />)

      cy.get('[data-testid="editor"]')
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
          let newBlock: FlowContent = (editor.children[0] as Group).children[0]
            ?.children?.[1]?.children[0]
          expect(changes).to.have.lengthOf.greaterThan(2)
          let expected: ChangeOperation = ['moveBlock', newBlock.id]
          expect(changes).to.deep.include(expected)
        })
    })

    it('should respect block id when pressing escape in the beginning of a block AND the previous block is empty', () => {
      let block1 = statement({id: 'b1'}, [paragraph([text('')])])
      let block2 = statement({id: 'b2'}, [paragraph([text('move this block')])])

      let draft: Document = {
        id: 'foo',
        title: 'demo',
        subtitle: '',
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
        createTime: new Date(),
        updateTime: new Date(),
        author: '',
        publishTime: undefined,
      }

      let editor = buildEditorHook(plugins, EditorMode.Draft)

      let {client} = createTestQueryClient({
        draft,
      })

      cy.mount(<TestEditor editor={editor} client={client} draft={draft} />)

      cy.get('[data-testid="editor"]')
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

      cy.mount(<TestEditor editor={editor} client={client} draft={draft} />)

      cy.get('[data-testid="editor"]')
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
      // noop
      /**
       * let date = new Date()

      let block2 = statement({id: 'block2'}, [paragraph([text('Child 1')])])
      let block3 = statement({id: 'block3'}, [paragraph([text('Child 2')])])
      let block4 = statement({id: 'block4'}, [paragraph([text('Child 3')])])
      let block5 = statement({id: 'block5'}, [paragraph([text('Child 4')])])

      let block1 = statement({id: 'block1'}, [
        paragraph([text('Parent block')]),
        group([block2, block3, block4, block5]),
      ])

      elClient.setQueryData<Document>([queryKeys.GET_DRAFT, 'foo'], {
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
            block: blockToApi(block1),
            children: [
              {
                block: blockToApi(block2),
                children: [],
              },
              {
                block: blockToApi(block3),
                children: [],
              },
              {
                block: blockToApi(block4),
                children: [],
              },
              {
                block: blockToApi(block5),
                children: [],
              },
            ],
          },
        ],
      })

      let elEditor = buildEditorHook(plugins, EditorMode.Draft)
      // elcy.mount(<EditorPage editor={elEditor} shouldAutosave={false} />)

      cy.get('[data-testid="editor"]')
        .focus()
        .then(() => {
          elEditor.apply({
            type: 'set_selection',
            properties: {
              anchor: {
                path: [0, 0, 0, 0],
                offset: 0,
              },
              focus: {
                path: [0, 0, 0, 0],
                offset: 0,
              },
            },
            newProperties: {
              anchor: {
                path: [0, 0, 1, 1, 0, 0],
                offset: 0,
              },
              focus: {
                path: [0, 0, 1, 1, 0, 0],
                offset: 0,
              },
            },
          })
        })
        // TODO: make sure cypress-plugin-tab works before enabling it again
        // .tab({shift: true})

        .then(() => {
          let changes = editor.__mtt_changes
          expect(changes).to.have.length(3)
          let expected: Array<ChangeOperation> = [
            ['moveBlock', block3.id],
            ['moveBlock', block4.id],
            ['moveBlock', block5.id],
          ]

          expect(changes).to.deep.equal(expected)
        })
       */
    })
  })

  describe('Delete Operations', () => {
    it('should delete one block', () => {
      let block1 = statement({id: 'b1'}, [paragraph([text('Parent block')])])
      let block2 = statement({id: 'b2'}, [paragraph([text('')])])
      let draft: Document = {
        id: 'foo',
        title: '',
        subtitle: '',
        author: 'authortest',
        updateTime: new Date(),
        createTime: new Date(),
        publishTime: undefined,
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
      }

      let editor = buildEditorHook(plugins, EditorMode.Draft)

      let {client} = createTestQueryClient({
        draft,
      })

      cy.mount(<TestEditor editor={editor} client={client} draft={draft} />)

      cy.get('[data-testid="editor"]')
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

      cy.mount(<TestEditor editor={editor} client={client} draft={draft} />)

      cy.get('[data-testid="editor"]')
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

      cy.mount(<TestEditor editor={editor} client={client} draft={draft} />)

      cy.get('[data-testid="editor"]')
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

    it('should add when block type changes', () => {
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

      cy.mount(<TestEditor editor={editor} client={client} draft={draft} />)

      cy.get('[data-block-id="b1"]')
        .wait(500)
        .then(() => {
          ;(
            window.blockToolsService as InterpreterFrom<
              typeof blockToolsMachine
            >
          ).send({type: 'MOUSE.MOVE', mouseY: 40})
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

      cy.mount(<TestEditor editor={editor} client={client} draft={draft} />)

      cy.get('[data-testid="editor"]')
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
        .click({force: true})
        .get('[data-testid="modal-link-remove-button"]')
        .should('be.disabled')
        .get('[data-testid="modal-link-input"]')
        .type('https://mintter.com', {force: true})
        .get('[type="submit"]')
        .click({force: true})
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

      cy.mount(<TestEditor editor={editor} client={client} draft={draft} />)

      cy.get('[data-testid="editor"]')
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
        .click({force: true})
        .get('[data-testid="modal-link-remove-button"]')
        .click({force: true})
        .then(() => {
          let changes = editor.__mtt_changes
          expect(changes).to.have.lengthOf.greaterThan(1)
          let expected: ChangeOperation = ['replaceBlock', 'b1']
          expect(changes).to.deep.include(expected)
        })
    })
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

    cy.mount(<TestEditor editor={editor} client={client} draft={draft} />, {
      client,
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
      .paste({pastePayload: 'mtt://d1/v1/b1', pasteType: 'text'})
      .contains(blockContent)
  })
})

type TestEditorProps = {
  client: QueryClient
  editor: EditorType
  draft: Document
}

function TestEditor({editor, client, draft}: TestEditorProps) {
  let service = useInterpret(() =>
    createDraftMachine({draft, client, editor, shouldAutosave: false}),
  )
  let blockToolsService = useInterpret(() =>
    blockToolsMachine.withConfig({
      services: {
        /**
         * We are overriding the mouseListener here because Cypress restores the mouse
         * every time we trigger any mouse move, so we cannot use the builtin system.
         * This in conjunction with the window assignment below
         * (`window.blockToolsService = blockToolsService`), we can trigger
         * mouse move events to the machine without any side effects from Cypress
         */
        mouseListener: () => Promise.resolve(),
      },
    }),
  )
  let [state, send] = useActor(service)

  useEffect(() => {
    send('LOAD')

    return () => {
      send('UNLOAD')
    }
  }, [send])

  // @ts-ignore
  window.blockToolsService = blockToolsService

  if (state.matches('editing') && state.context.localDraft?.content) {
    return (
      <BlockToolsProvider value={blockToolsService}>
        <FileProvider value={service}>
          <BlockTools mode={EditorMode.Draft} isEditing={false} />
          <Editor
            plugins={plugins}
            value={state.context.localDraft.content}
            editor={state.context.editor}
            onChange={(content) => {
              if (!content && typeof content == 'string') return
              send({type: 'DRAFT.UPDATE', payload: {content}})
            }}
          />
        </FileProvider>
      </BlockToolsProvider>
    )
  }

  return null
}

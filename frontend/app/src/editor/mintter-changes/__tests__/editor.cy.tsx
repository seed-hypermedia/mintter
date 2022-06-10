import {Document} from '@app/client'
import {blockToApi} from '@app/client/v2/block-to-api'
import {createDraftMachine} from '@app/draft-machine'
import {Editor} from '@app/editor/editor'
import {
  ChangeOperation,
  changesService,
} from '@app/editor/mintter-changes/plugin'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {mountProviders} from '@app/test/utils'
import {
  FlowContent,
  GroupingContent,
  heading,
  link,
  paragraph,
  statement,
  staticParagraph,
  text,
} from '@mintter/mttast'
import {useMachine} from '@xstate/react'
import {useEffect} from 'react'
import {QueryClient} from 'react-query'
import {Editor as EditorType} from 'slate'

describe('Editor', () => {
  beforeEach(() => {
    changesService.reset()
  })

  describe('Move Operations', () => {
    it('should add the default content block to changes', () => {
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

      let {render, client} = mountProviders({
        draft,
      })

      render(<TestEditor editor={editor} client={client} draft={draft} />)

      cy.get('[data-testid="editor"]').then(() => {
        console.log({editor})
        expect(changesService.getChanges()).to.have.length(2)
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

      let {render, client} = mountProviders({
        draft,
      })

      render(<TestEditor editor={editor} client={client} draft={draft} />)

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
          let changes = changesService.getChanges()
          console.log(
            '🚀 ~ file: editor.cy.tsx ~ line 99 ~ .then ~ changes',
            changes,
          )
          let newBlock: FlowContent = (editor.children[0] as GroupingContent)
            .children[0].children[1]!.children[0]
          expect(changes).to.have.length(6)
          expect(changes[4]).to.deep.equal(['moveBlock', newBlock.id])
        })
    })

    it.skip('should respect block id when pressing escape in the beginning of a block AND the previous block is empty', () => {
      // noop
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

      let {render, client} = mountProviders({
        draft,
      })

      render(<TestEditor editor={editor} client={client} draft={draft} />)

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
          let changes = changesService.getChanges()
          let newBlock: FlowContent = (editor.children[0] as GroupingContent)
            .children[1]
          expect(changes).to.have.length(3)
          expect(changes[1]).to.deep.equal(['moveBlock', newBlock.id])
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
      // elRender(<EditorPage editor={elEditor} shouldAutosave={false} />)

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
          let changes = changesService.getChanges()
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

      let {render, client} = mountProviders({
        draft,
      })

      render(<TestEditor editor={editor} client={client} draft={draft} />)

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
          let changes = changesService.getChanges()
          expect(changes).to.have.length(1)
          let expected: ChangeOperation = ['deleteBlock', 'b2']

          expect(changes[0]).to.deep.equal(expected)
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

      let {render, client} = mountProviders({
        draft,
      })

      render(<TestEditor editor={editor} client={client} draft={draft} />)

      cy.get('[data-testid="editor"]')
        .type(' ') // need to type this because if not the first letter is not typed ¯\_(ツ)_/¯
        .type('Hello World')
        .then(() => {
          let changes = changesService.getChanges()
          expect(changes).to.have.length(1)

          let expected: ChangeOperation = ['replaceBlock', 'b1']

          expect(changes[0]).to.deep.equal(expected)
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

      let {render, client} = mountProviders({
        draft,
      })

      render(<TestEditor editor={editor} client={client} draft={draft} />)

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
          let changes = changesService.getChanges()
          expect(changes).to.have.length(1)

          let expected: ChangeOperation = ['replaceBlock', 'b1']

          expect(changes[0]).to.deep.equal(expected)
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

      let {render, client} = mountProviders({
        draft,
      })

      render(<TestEditor editor={editor} client={client} draft={draft} />)

      cy.get('[data-testid="editor"]')
        .get('[data-trigger]')
        .click()
        .get('[data-testid="item-Statement"]')
        .click()
        .then(() => {
          let changes = changesService.getChanges()
          expect(changes).to.have.length(1)
          let expected: ChangeOperation = ['replaceBlock', 'b1']
          expect(changes[0]).to.deep.equal(expected)
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

      let {render, client} = mountProviders({
        draft,
      })

      render(<TestEditor editor={editor} client={client} draft={draft} />)

      cy.get('[data-testid="editor"]')
        .then(() => {
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
          let changes = changesService.getChanges()
          expect(changes).to.have.length(1)

          let expected: ChangeOperation = ['replaceBlock', 'b1']

          expect(changes[0]).to.deep.equal(expected)
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

      let {render, client} = mountProviders({
        draft,
      })

      render(<TestEditor editor={editor} client={client} draft={draft} />)

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
        .click()
        .get('[data-testid="modal-link-remove-button"]')
        .click()
        .then(() => {
          let changes = changesService.getChanges()
          expect(changes).to.have.length(1)
          let expected: ChangeOperation = ['replaceBlock', 'b1']
          expect(changes[0]).to.deep.equal(expected)
        })
    })
  })
})

type TestEditorProps = {
  client: QueryClient
  editor: EditorType
  draft: Document
}

function TestEditor({editor, client, draft}: TestEditorProps) {
  let [state, send] = useMachine(
    () => createDraftMachine({editor, client, draft, shouldAutosave: false}),
    {
      actions: {
        updateLibrary: () => {
          // noop
        },
      },
    },
  )

  useEffect(() => {
    send('LOAD')

    return () => {
      send('UNLOAD')
    }
  }, [])

  if (state.matches('editing') && state.context.localDraft?.content) {
    return (
      <Editor
        value={state.context.localDraft.content}
        editor={state.context.editor}
        onChange={(content) => {
          if (!content && typeof content == 'string') return
          send({type: 'DRAFT.UPDATE', payload: {content}})
        }}
      />
    )
  }

  return null
}

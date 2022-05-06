import {Account, Document} from '@app/client'
import {blockToApi} from '@app/client/v2/block-to-api'
import {
  ChangeOperation,
  changesService,
} from '@app/editor/mintter-changes/plugin'
import {buildEditorHook, EditorMode} from '@app/editor/plugin-utils'
import {plugins} from '@app/editor/plugins'
import {queryKeys} from '@app/hooks'
import EditorPage from '@app/pages/editor'
import {MainPageProviders, mountWithAccount} from '@app/test/utils'
import {
  FlowContent,
  group,
  GroupingContent,
  heading,
  paragraph,
  statement,
  staticParagraph,
  text,
} from '@mintter/mttast'
import {QueryClient} from 'react-query'

describe('Editor Changes', () => {
  let elClient: QueryClient
  let elRender: any

  beforeEach(() => {
    const {client, render} = mountWithAccount()
    let date = new Date()

    client.setQueryData<Document>([queryKeys.GET_DRAFT, 'foo'], {
      id: 'foo',
      title: '',
      subtitle: '',
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

  it.skip('should add title change', () => {
    // TODO: because we are using the first block as title, we need to check this from somewhere else. because we are sending the title change before we autosave (we are not autosaving in tests)
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
      .type('hello demo')
      .then(() => {
        let changes = changesService.getChanges()
        console.log(
          '🚀 ~ file: editor-changes.cy.tsx ~ line 77 ~ .then ~ changes',
          changes,
        )

        expect(changes).to.have.length(3)
      })
  })

  describe('Move Operations', () => {
    it('add default content block to changes', () => {
      let elEditor = buildEditorHook(plugins, EditorMode.Draft)
      elRender(
        <MainPageProviders
          client={elClient}
          mainPageContext={{params: {docId: 'foo'}}}
        >
          <EditorPage editor={elEditor} shouldAutosave={false} />
        </MainPageProviders>,
      )

      cy.get('[data-testid="editor"]').then(() => {
        expect(changesService.getChanges()).to.have.length(2)
      })
    })

    it('add move to the correct parent when enter from heading', () => {
      let date = new Date()
      let block = heading({id: 'block1'}, [
        staticParagraph([text('Hello World')]),
      ])
      elClient.setQueryData<Document>([queryKeys.GET_DRAFT, 'foo'], {
        id: 'foo',
        title: '',
        subtitle: '',
        author: 'authortest',
        content: '',
        children: [
          {
            block: blockToApi(block),
            children: [],
          },
        ],
        updateTime: date,
        createTime: date,
        publishTime: date,
      })

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
            '🚀 ~ file: editor-changes.cy.tsx ~ line 159 ~ .then ~ changes',
            changes,
          )
          let newBlock: FlowContent = (elEditor.children[0] as GroupingContent)
            .children[0].children[1]!.children[0]
          expect(changes).to.have.length(2)
          expect(changes[1]).to.deep.equal(['moveBlock', newBlock.id])
        })
    })

    it('add new block when press enter', () => {
      let date = new Date()
      let block = statement({id: 'block1'}, [paragraph([text('Hello World')])])
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
            block: blockToApi(block),
            children: [],
          },
        ],
      })

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
          let newBlock: FlowContent = (elEditor.children[0] as GroupingContent)
            .children[1]
          expect(changes).to.have.length(2)
          expect(changes[1]).to.deep.equal(['moveBlock', newBlock.id])
        })
    })

    it('re-parent block and siblings (tab + shift)', () => {
      let date = new Date()

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
        .tab({shift: true})

        .then(() => {
          let changes = changesService.getChanges()
          console.log(
            '🚀 ~ file: editor-changes.cy.tsx ~ line 471 ~ .then ~ changes',
            changes,
          )

          expect(changes).to.have.length(3)
          let expected: Array<ChangeOperation> = [
            ['moveBlock', block3.id],
            ['moveBlock', block4.id],
            ['moveBlock', block5.id],
          ]

          expect(changes).to.deep.equal(expected)
        })
    })
  })

  describe('Delete Operations', () => {
    it('delete one block', () => {
      let date = new Date()
      let block1 = statement({id: 'block1'}, [
        paragraph([text('Parent block')]),
      ])
      // TODO: empty blocks cause some problems on transformation to slate
      let block2 = statement({id: 'block2'}, [paragraph([text('')])])

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
            children: [],
          },
          {
            block: blockToApi(block2),
            children: [],
          },
        ],
      })

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
          console.log(
            '🚀 ~ file: editor-changes.cy.tsx ~ line 395 ~ .then ~ changes',
            changes,
          )

          expect(changes).to.have.length(1)
          let expected: ChangeOperation = ['deleteBlock', 'block2']

          expect(changes[0]).to.deep.equal(expected)
        })
    })

    it.skip('delete block with descendants', () => {
      let date = new Date()
      let block1 = statement({id: 'block1'}, [
        paragraph([text('Parent block')]),
      ])
      let block3 = statement({id: 'block3'}, [paragraph([text('delete me')])])

      let block2 = statement({id: 'block2'}, [
        paragraph([text('')]),
        group([block3]),
      ])

      elClient.setQueryData<Document>([queryKeys.GET_DRAFT, 'foo'], {
        id: 'foo',
        title: '',
        subtitle: '',
        author: 'authortest',
        content: JSON.stringify([group([block1, block2])]),
        updateTime: date,
        createTime: date,
        publishTime: date,
        children: [
          {
            block: blockToApi(block1),
            children: [],
          },
          {
            block: blockToApi(block2),
            children: [
              {
                block: blockToApi(block3),
                children: [],
              },
            ],
          },
        ],
      })

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
          console.log(
            '🚀 ~ file: editor-changes.cy.tsx ~ line 478 ~ .then ~ changes',
            changes,
            elEditor.children,
          )
          let expected: Array<ChangeOperation> = [
            ['deleteBlock', 'block2'],
            ['moveBlock', 'block3'],
          ]

          // TODO: result:
          // - block1
          //   - block3

          expect(changes).to.have.length(2)
          expect(changes).to.deep.equal(expected)
        })
    })
  })

  describe('Replace Operations', () => {
    it('should add after editing empty block', () => {
      let date = new Date()
      let block = statement({id: 'block1'}, [paragraph([text('')])])
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
            block: blockToApi(block),
            children: [],
          },
        ],
      })

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
        .type(' ') // need to type this because if not the first letter is not typed 🤷🏼‍♂️
        .type('Hello World')
        .then(() => {
          let changes = changesService.getChanges()
          expect(changes).to.have.length(1)

          let expected: ChangeOperation = ['replaceBlock', 'block1']

          expect(changes[0]).to.deep.equal(expected)
        })
    })

    it('should add after adding content to an existing block', () => {
      let date = new Date()
      let block = statement({id: 'block1'}, [paragraph([text('Hello World')])])
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
            block: blockToApi(block),
            children: [],
          },
        ],
      })

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
                offset: 11,
              },
              focus: {
                path: [0, 0, 0, 0],
                offset: 11,
              },
            },
          })
        })
        .type('. more text.')

        .then(() => {
          let changes = changesService.getChanges()

          expect(changes).to.have.length(1)

          let expected: ChangeOperation = ['replaceBlock', 'block1']

          expect(changes[0]).to.deep.equal(expected)
        })
    })

    it('should add when block type changes', () => {
      let date = new Date()
      let block = heading({id: 'block1'}, [
        staticParagraph([text('Hello World')]),
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
            block: blockToApi(block),
            children: [],
          },
        ],
      })

      let elEditor = buildEditorHook(plugins, EditorMode.Draft)
      elRender(
        <MainPageProviders
          client={elClient}
          hoverContext={{blockId: 'block1'}}
          mainPageContext={{params: {docId: 'foo'}}}
        >
          <EditorPage editor={elEditor} shouldAutosave={false} />
        </MainPageProviders>,
      )

      cy.get('[data-testid="editor"]')
        .get('[data-trigger]')
        .click()
        .get('[data-testid="item-Statement"]')
        .click()
        .then(() => {
          let changes = changesService.getChanges()
          expect(changes).to.have.length(1)
          let expected: ChangeOperation = ['replaceBlock', 'block1']
          expect(changes[0]).to.deep.equal(expected)
        })
    })
  })
})

import {Separator, SizableText, TextArea, XStack, YStack} from '@shm/ui'
import {Fragment} from '@tiptap/pm/model'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {NodeSelection} from 'prosemirror-state'
import {useEffect, useRef, useState} from 'react'
import {findNextBlock, findPreviousBlock} from './block-utils'
import {
  Block,
  BlockNoteEditor,
  createReactBlockSpec,
  defaultProps,
  getBlockInfoFromPos,
} from './blocknote'
import {HMBlockSchema} from './schema'

export const MathBlock = (type: 'equation' | 'math') =>
  createReactBlockSpec({
    type,
    propSchema: {
      ...defaultProps,
    },
    containsInlineContent: true,
    // @ts-ignore
    render: ({
      block,
      editor,
    }: {
      block: Block<HMBlockSchema>
      editor: BlockNoteEditor<HMBlockSchema>
    }) => Render(block, editor),

    parseHTML: [
      {
        tag: 'div[data-content-type=math]',
        priority: 1000,
        getContent: (node, schema) => {
          const element = node instanceof HTMLElement ? node : null
          const content = element?.getAttribute('data-content')

          if (content) {
            const textNode = schema.text(content)
            const fragment = Fragment.from(textNode)
            return fragment
          }

          return Fragment.empty
        },
      },
    ],
  })

const Render = (
  block: Block<HMBlockSchema>,
  editor: BlockNoteEditor<HMBlockSchema>,
) => {
  const [selected, setSelected] = useState(false)
  const [opened, setOpened] = useState(false)
  const mathRef = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const tiptapEditor = editor._tiptapEditor
  const selection = tiptapEditor.state.selection

  useEffect(() => {
    const selectedNode = getBlockInfoFromPos(
      tiptapEditor.state.doc,
      tiptapEditor.state.selection.from,
    )
    if (selectedNode && selectedNode.id) {
      if (
        selectedNode.id === block.id &&
        selectedNode.startPos === selection.$anchor.pos
      ) {
        setSelected(true)
        setOpened(true)
      } else if (selectedNode.id !== block.id) {
        setSelected(false)
        setOpened(false)
      }
    }
  }, [selection, block.id])

  useEffect(() => {
    if (mathRef.current) {
      if (block.content[0]) {
        try {
          mathRef.current.style.color = ''
          katex.render(block.content[0].text, mathRef.current, {
            throwOnError: true,
            displayMode: true,
          })
        } catch (e) {
          if (e instanceof katex.ParseError) {
            mathRef.current.innerText =
              "Error in LaTeX '" +
              block.content[0].text +
              "':\n" +
              e.message.split(':')[1]
            mathRef.current.style.color = 'red'
          } else {
            throw e
          }
        }
      } else {
        katex.render('\\color{gray} TeX math', mathRef.current, {
          throwOnError: false,
          displayMode: true,
        })
      }
    }
  }, [block.content])

  useEffect(() => {
    if (opened && inputRef.current) {
      // @ts-ignore
      inputRef.current.focus()
      const length = inputRef.current.value.length
      inputRef.current.setSelectionRange(length, length)
    }
  }, [opened])

  return (
    <YStack
      backgroundColor={selected ? '$color3' : '$color4'}
      borderColor={selected ? '$color8' : 'transparent'}
      borderWidth={2}
      borderRadius="$2"
      overflow="hidden"
      hoverStyle={{
        backgroundColor: '$color3',
      }}
      // @ts-ignore
      contentEditable={false}
      className={block.type}
      group="item"
      outlineWidth="$0"
    >
      <YStack
        minHeight="$7"
        ai="center"
        justifyContent="center"
        paddingVertical="10px"
        paddingHorizontal="16px"
        position="relative"
        hoverStyle={{cursor: `${!opened ? 'pointer' : ''}`}}
      >
        <SizableText ref={mathRef} />
      </YStack>
      {opened && (
        <YStack>
          <Separator backgroundColor="$color12" />
          <XStack
            minHeight="$7"
            paddingVertical="10px"
            paddingHorizontal="16px"
            position="relative"
            ai="center"
          >
            <TextArea
              ref={inputRef}
              onBlur={() => {
                if (!selected) setOpened(false)
              }}
              onKeyPress={(e) => {
                // @ts-ignore
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  const {state, view} = tiptapEditor
                  const prevBlockInfo = findPreviousBlock(
                    view,
                    state.selection.from,
                  )
                  if (prevBlockInfo) {
                    const {prevBlock, prevBlockPos} = prevBlockInfo
                    const prevNode = prevBlock.firstChild!
                    const prevNodePos = prevBlockPos + 1
                    if (
                      [
                        'image',
                        'file',
                        'embed',
                        'video',
                        'web-embed',
                        'equation',
                        'math',
                      ].includes(prevNode.type.name)
                    ) {
                      const selection = NodeSelection.create(
                        state.doc,
                        prevNodePos,
                      )
                      view.dispatch(state.tr.setSelection(selection))
                      return true
                    } else {
                      editor.setTextCursorPosition(
                        editor.getTextCursorPosition().prevBlock!,
                        'end',
                      )
                    }
                    editor.focus()
                    setOpened(false)
                  }
                }
                // @ts-ignore
                else if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  const {state, view} = tiptapEditor
                  let nextBlockInfo = findNextBlock(view, state.selection.from)
                  if (nextBlockInfo) {
                    const {nextBlock, nextBlockPos} = nextBlockInfo
                    const nextNode = nextBlock.firstChild!
                    const nextNodePos = nextBlockPos + 1
                    if (
                      [
                        'image',
                        'file',
                        'embed',
                        'video',
                        'web-embed',
                        'equation',
                        'math',
                      ].includes(nextNode.type.name)
                    ) {
                      const selection = NodeSelection.create(
                        state.doc,
                        nextNodePos,
                      )
                      view.dispatch(state.tr.setSelection(selection))
                    } else {
                      editor.setTextCursorPosition(
                        editor.getTextCursorPosition().nextBlock!,
                        'start',
                      )
                    }
                    editor.focus()
                    setOpened(false)
                  }
                }
              }}
              width={'100%'}
              placeholder="E = mc^2"
              value={block.content[0] ? block.content[0].text : ''}
              onChange={(e) => {
                // @ts-ignore
                editor.updateBlock(block, {
                  ...block,
                  content: [
                    {
                      type: 'text',
                      text: e.nativeEvent.text,
                      styles: {},
                    },
                  ],
                })
              }}
            />
          </XStack>
        </YStack>
      )}
    </YStack>
  )
}

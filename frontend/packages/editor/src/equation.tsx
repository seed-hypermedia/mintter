import {Separator, SizableText, TextArea, XStack, YStack} from '@mintter/ui'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {useEffect, useRef, useState} from 'react'
import {
  Block,
  BlockNoteEditor,
  createReactBlockSpec,
  defaultProps,
  getBlockInfoFromPos,
} from './blocknote'
import {HMBlockSchema} from './schema'

export const EquationBlock = createReactBlockSpec({
  type: 'equation',
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
})

const Render = (
  block: Block<HMBlockSchema>,
  editor: BlockNoteEditor<HMBlockSchema>,
) => {
  const [selected, setSelected] = useState(false)
  const [opened, setOpened] = useState(false)
  const equationRef = useRef<HTMLSpanElement>(null)
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
    if (equationRef.current) {
      if (block.content[0]) {
        try {
          equationRef.current.style.color = ''
          katex.render(block.content[0].text, equationRef.current, {
            throwOnError: true,
            displayMode: true,
          })
        } catch (e) {
          if (e instanceof katex.ParseError) {
            equationRef.current.innerText =
              "Error in LaTeX '" +
              block.content[0].text +
              "':\n" +
              e.message.split(':')[1]
            equationRef.current.style.color = 'red'
          } else {
            throw e
          }
        }
      } else {
        katex.render('\\color{gray} TeX equation', equationRef.current, {
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
        <SizableText ref={equationRef} />
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
              onBlur={() => setOpened(false)}
              onKeyDown={(e) => {
                console.log(e)
                // Allow arrow key events to propagate and be handled elsewhere
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                  console.log('Arrow key pressed, handling elsewhere')
                  // Do not preventDefault or stopPropagation
                  return
                }
                // Handle other keys as needed
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

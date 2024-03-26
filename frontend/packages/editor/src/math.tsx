import {Button, Input, Popover, SizableText, XStack, YStack} from '@mintter/ui'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {useEffect, useRef, useState} from 'react'
import {
  Block,
  BlockNoteEditor,
  createReactBlockSpec,
  defaultProps,
} from './blocknote'
import {HMBlockSchema} from './schema'

export const MathBlock = createReactBlockSpec({
  type: 'math',
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
  const [hovered, setHovered] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const mathRef = useRef(null)
  // const renderMath = (content) => {
  //   try {
  //     return katex.renderToString(content, {
  //       throwOnError: false,
  //     })
  //   } catch (e) {
  //     return content // or handle the error in a more sophisticated way
  //   }
  // }

  useEffect(() => {
    if (mathRef.current) {
      if (block.content[0]) {
        try {
          katex.render(block.content[0].text, mathRef.current, {
            throwOnError: true,
            displayMode: true,
          })
        } catch (e) {
          if (e instanceof katex.ParseError) {
            // KaTeX can't parse the expression
            katex.render(
              "Error in LaTeX '" + block.content[0].text + "': " + e.message,
              mathRef.current,
              {
                throwOnError: false,
              },
            )
          } else {
            throw e
          }
        }
      } else {
        katex.render('\\color{gray} E = mc^2', mathRef.current, {
          throwOnError: false,
          displayMode: true,
        })
      }
    }
  }, [block.content])

  return (
    <YStack
      // @ts-ignore
      contentEditable={false}
      minHeight="$7"
      backgroundColor="$color4"
      borderRadius="6px"
      paddingVertical="10px"
      paddingHorizontal="16px"
      position="relative"
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => {
        if (!popoverOpen) setHovered(false)
        else return
      }}
    >
      {hovered && (
        <XStack
          position="absolute"
          top={0}
          right={0}
          zIndex="$zIndex.5"
          width="100%"
          ai="center"
          jc="flex-end"
          opacity={hovered ? 1 : 0}
          padding="$2"
          gap="$2"
          $group-item-hover={{opacity: 1}}
        >
          <Popover
            placement="bottom"
            size="$5"
            open={popoverOpen}
            // defaultOpen={boolRegex.test(block.props.defaultOpen)}
            stayInFrame
          >
            <Popover.Trigger asChild>
              <Button
                // icon={icon}
                borderRadius={0}
                size="$1"
                justifyContent="flex-start"
                backgroundColor="$color3"
                hoverStyle={{
                  backgroundColor: '$color4',
                }}
                onPress={() => setPopoverOpen(true)}
              >
                Update Equation
              </Button>
            </Popover.Trigger>
            <Popover.Content
              padding={0}
              elevation="$3"
              size="$5"
              borderRadius="$5"
              shadowColor="$shadowColor"
              opacity={1}
              enterStyle={{x: 0, y: -10, opacity: 0}}
              exitStyle={{x: 0, y: -10, opacity: 0}}
              animation={[
                'fast',
                {
                  opacity: {
                    overshootClamping: true,
                  },
                },
              ]}
            >
              <Input
                onBlur={() => {
                  setPopoverOpen(false)
                }}
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
            </Popover.Content>
          </Popover>
        </XStack>
      )}
      <SizableText ai="center" ac="center" ref={mathRef} />
    </YStack>
  )
}

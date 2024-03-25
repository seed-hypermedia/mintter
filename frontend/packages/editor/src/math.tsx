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
  // content: 'inline',
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
  const mathRef = useRef(null)
  const renderMath = (content) => {
    try {
      return katex.renderToString(content, {
        throwOnError: false,
      })
    } catch (e) {
      return content // or handle the error in a more sophisticated way
    }
  }

  useEffect(() => {
    if (mathRef.current) {
      console.log(block.content)
      if (block.content[0]) {
        katex.render(block.content[0].text, mathRef.current, {
          throwOnError: false,
        })
      }
    }
  }, [block.content])

  return (
    // <MediaContainer
    //   editor={editor}
    //   block={block}
    //   mediaType="math"
    //   selected={false}
    //   setSelected={() => {}}
    //   assign={() => {}}
    //   styleProps={{
    //     height: '500px',
    //   }}
    // >
    // {/* {renderMath(`$${block.content}$`)} */}
    // {/* {renderMath('c = \\pm\\sqrt{a^2 + b^2}')} */}
    // <span ref={mathRef} />
    // </MediaContainer>
    // background-color: var(--color4);
    // border-radius: 6px;
    // padding: 10px 16px;
    // overflow: auto;
    // position: 'relative';
    <YStack
      contentEditable={false}
      alignContent="center"
      alignItems="center"
      backgroundColor="$color4"
      borderRadius="6px"
      paddingVertical="10px"
      paddingHorizontal="16px"
      position="relative"
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
    >
      {hovered && (
        <XStack
          position="absolute"
          top={-8}
          right={-12}
          width={150}
          zIndex={100}
          ai="center"
          jc="flex-end"
          opacity={hovered ? 1 : 0}
          padding="$1"
          gap="$4"
          $group-item-hover={{opacity: 1}}
        >
          <Popover
            placement="bottom"
            size="$5"
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
                value={block.content[0].text}
                onChange={(e) => {
                  // @ts-ignore
                  editor.updateBlock(block, {
                    ...block,
                    content:
                      e.nativeEvent.text.length > 0
                        ? e.nativeEvent.text
                        : undefined,
                  })
                }}
              />
            </Popover.Content>
          </Popover>
          {/* <Input
            onChange={(e) => {
              // @ts-ignore
              editor.updateBlock(block, {
                ...block,
                content:
                  e.nativeEvent.text.length > 0 ? e.nativeEvent.text : undefined,
              })
            }}
          /> */}
        </XStack>
      )}
      <SizableText ref={mathRef} />
      {/* <InlineContent ref={mathRef} /> */}
    </YStack>
  )
}

import {
  useBlockConversations,
  useConversations,
} from '@app/editor/comments/conversations-context'
import {findPath} from '@app/editor/utils'
import {Button} from '@components/button'
import {Icon} from '@components/icon'
import {Text} from '@components/text'
import {FlowContent} from '@mintter/shared'
import {useEffect, useMemo} from 'react'
import {Editor, Transforms} from 'slate'
import {useSlate} from 'slate-react'

export function ConversationBlockBubble({block}: {block: FlowContent}) {
  let editor = useSlate()
  let conversations = useBlockConversations(block.id, block.revision)

  let commentsCount = useMemo(() => {
    return conversations.reduce((acc, c) => acc + c.comments.length, 0)
  }, [conversations])

  let convContext = useConversations()
  let path = findPath(block)

  const {onConversationsOpen} = useConversations()

  useEffect(() => {
    if (convContext.clientSelectors[block.id]) {
      Editor.withoutNormalizing(editor, () => {
        Transforms.removeNodes(editor, {at: path.concat(0)})
        Transforms.insertNodes(
          editor,
          convContext.clientSelectors[block.id].children[0],
          {at: path.concat(0)},
        )
      })
    }
  }, [convContext.clientSelectors])

  if (conversations.length) {
    return (
      <Button
        onClick={(e) => {
          e.preventDefault()
          onConversationsOpen(conversations.map((c) => c.id))
        }}
        color="muted"
        variant="ghost"
        size="0"
        contentEditable={false}
        css={{
          userSelect: 'none',
          position: 'absolute',
          top: 10,
          right: -54,
          display: 'flex',
          alignItems: 'center',
          gap: '$2',
          paddingInline: '$3',
          paddingBlock: '$1',
          // borderRadius: '$2',
          zIndex: 100,
          '&:hover': {
            backgroundColor: '$base-component-bg-hover',
            cursor: 'pointer',
          },
        }}
      >
        <Icon name="MessageBubble" size="2" color="muted" />
        <Text
          size="2"
          color="muted"
          css={{
            '&:hover': {
              color: '$base-text-low',
            },
          }}
        >
          {commentsCount}
        </Text>
      </Button>
    )
  }

  return null
}

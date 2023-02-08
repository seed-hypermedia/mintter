import {
  useBlockConversations,
  useConversations,
} from '@app/editor/comments/conversations-context'
import {Button} from '@components/button'
import {Text} from '@components/text'
import {Icon} from '@components/icon'
import {FlowContent} from '@mintter/shared'

export function ConversationBlockBubble({block}: {block: FlowContent}) {
  let conversations = useBlockConversations(block.id, block.revision)

  const {onConversationsOpen} = useConversations()
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
          position: 'absolute',
          top: 0,
          right: -40,
          display: 'flex',
          alignItems: 'center',
          gap: '$2',
          paddingInline: '$3',
          paddingBlock: '$1',
          // borderRadius: '$2',
          zIndex: '$max',
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
          {conversations.length}
        </Text>
      </Button>
    )
  }

  return null
}

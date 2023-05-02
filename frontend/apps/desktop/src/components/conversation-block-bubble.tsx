import {
  useBlockConversations,
  useConversations,
} from '@app/editor/comments/conversations-context'
import {findPath} from '@app/editor/utils'
import {FlowContent} from '@mintter/shared'
import {Button, Comment} from '@mintter/ui'
import {MessageSquare} from '@tamagui/lucide-icons'
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
        theme="blue"
        onPress={() => {
          onConversationsOpen(conversations.map((c) => c.id))
        }}
        chromeless
        size="$1"
        userSelect="none"
        position="absolute"
        top={10}
        right={-54}
        paddingHorizontal="$2"
        paddingVertical="$1"
        zIndex="$10"
        hoverTheme
        hoverStyle={{
          backgroundColor: '$background',
          cursor: 'pointer',
        }}
        icon={Comment}
        //@ts-ignore
        contentEditable={false}
      >
        {commentsCount}
      </Button>
    )
  }

  return null
}

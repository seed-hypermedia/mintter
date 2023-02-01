import '../styles/discussion.scss'

import {useAuthor, useDiscussion} from '@app/hooks'
import {ClientPublication} from '@app/publication-machine'
import {formattedDate} from '@app/utils/get-format-date'
import {Avatar} from '@components/avatar'
import {DiscussionItem} from '@components/discussion-item'
import {appWindow} from '@tauri-apps/api/window'
import {useEffect} from 'react'
import {useConversations} from '@app/editor/comments/conversations-context'
import {Conversation} from '@mintter/shared'

export function Conversations() {
  const conversations = useConversations()

  useEffect(() => {
    let isSubscribed = true
    let unlisten: () => void

    appWindow
      .onFocusChanged(({payload: focused}) => {
        if (!isSubscribed) {
          return unlisten()
        }

        if (focused) {
          refetch()
        }
        console.log('Focus changed, window is focused? ' + focused)
      })
      .then((_unlisten) => (unlisten = _unlisten))

    return () => {
      isSubscribed = false
    }
  })

  return (
    <div className="discussions-wrapper">
      <ul className="discussion-list" data-testid="discussion-list">
        {conversations.map((conversation) => (
          <ConversationItem key={conversation.id} conversation={conversation} />
        ))}
      </ul>
    </div>
  )
}

function ConversationItem({conversation}: {conversation: Conversation}) {
  console.log(
    '🚀 ~ file: conversations.tsx:50 ~ ConversationItem ~ conversation',
    conversation,
  )
  return (
    <div>
      <h3>Conversation item: {conversation.id}</h3>
      <span>{JSON.stringify(conversation)}</span>
    </div>
  )
}

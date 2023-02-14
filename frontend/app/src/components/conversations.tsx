import {useConversations} from '@app/editor/comments/conversations-context'
import {createPromiseClient} from '@bufbuild/connect-web'
import {Avatar} from '@components/avatar'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Text} from '@components/text'
import {TextField} from '@components/text-field'
import {
  Block,
  blockToApi,
  Comments,
  Conversation,
  ListConversationsResponse,
  paragraph,
  PhrasingContent,
  Selector,
  statement,
  text,
  transport,
} from '@mintter/shared'
import {UseQueryResult} from '@tanstack/react-query'
import {appWindow} from '@tauri-apps/api/window'
import {FormEvent, useEffect, useMemo, useState} from 'react'

export function Conversations() {
  const context = useConversations()

  const {documentId, conversations} = context
  const {data, refetch} = conversations || {}

  useEffect(() => {
    let isSubscribed = true
    let unlisten: () => void

    appWindow
      .onFocusChanged(({payload: focused}) => {
        if (!isSubscribed) {
          return unlisten()
        }

        if (focused) {
          refetch?.()
        }
      })
      .then((_unlisten) => (unlisten = _unlisten))

    return () => {
      isSubscribed = false
    }
  })

  return (
    <Box
      css={{
        paddingBottom: 100,
        paddingTop: '$4',
      }}
    >
      <Box
        css={{
          padding: 0,
          margin: 0,
        }}
        as="ul"
        data-testid="conversations-list"
      >
        {documentId
          ? data?.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                documentId={documentId}
                conversation={conversation}
                refetch={refetch}
              />
            ))
          : null}
      </Box>
    </Box>
  )
}

function ConversationItem({
  conversation,
  refetch,
  documentId,
}: {
  conversation: Conversation
  documentId: string
  refetch: UseQueryResult<ListConversationsResponse>['refetch']
}) {
  let [newComment, setNewComment] = useState('')
  let [firstComment, ...comments] = conversation.comments

  function submitReply(e: FormEvent) {
    e.preventDefault()
    let comment = newComment.replace(/\s/g, ' ')

    createPromiseClient(Comments, transport)
      .addComment({
        conversationId: conversation.id,
        comment: blockToApi(statement([paragraph([text(comment)])])),
      })
      .then((res) => {
        console.log('REPLY ADDED!', res)
        refetch()
      })
  }

  return (
    <Box
      css={{
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        transition: 'all 150ms ease',
        paddingBlock: '$5',
        paddingLeft: 60,
        '&:hover': {
          backgroundColor: '$base-background-subtle',
        },
      }}
    >
      <Box as="ul" css={{margin: 0, padding: 0}}>
        <CommentItem
          conversationId={conversation.id}
          comment={firstComment}
          selectors={conversation.selectors}
        />
        {!!comments.length ? (
          <Box
            as="li"
            css={{
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '$3',
              // paddingTop: selectors ? '$5' : '$3',
              width: '$full',
              paddingTop: '$5',
              marginRight: '$4',
              position: 'relative',
              paddingLeft: 48,
              '&:hover': {
                cursor: 'default',
              },
            }}
          >
            <Box
              as="ul"
              css={{
                margin: 0,
                padding: 0,
              }}
            >
              {comments.map((item) => (
                <CommentItem
                  key={`${item.id}-${item.revision}`}
                  comment={item}
                  conversationId={conversation.id}
                />
              ))}
            </Box>
          </Box>
        ) : null}
      </Box>
      <Box css={{display: 'flex', paddingBlock: '$4', paddingRight: '$4'}}>
        <Box
          as="form"
          onSubmit={submitReply}
          css={{
            flex: 1,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '$4',
            flexDirection: 'column',
          }}
        >
          <TextField
            textarea
            name="reply"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <Button color="muted" size="1" variant="outlined">
            Reply
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

function CommentItem({
  conversationId,
  comment,
  selectors,
}: {
  conversationId: string
  comment: Block
  selectors?: Array<Selector>
}) {
  return (
    <Box
      as="li"
      css={{
        listStyle: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '$3',
        paddingTop: selectors ? '$5' : '$3',
        position: 'relative',
        '&:hover': {
          cursor: 'default',
        },
      }}
    >
      <Box
        css={{
          position: 'absolute',
          top: selectors ? 8 : 0,
          left: -12,
          transform: 'translateX(-100%)',
          paddingBottom: 0,
          paddingLeft: '$5',
        }}
      >
        <Avatar accountId="" size={2} alias="demo alias" />
      </Box>
      <Box
        css={{
          display: 'flex',
          gap: '$6',
          flex: 1,
        }}
      >
        <Text size="2" fontWeight="bold">
          Demo alias
        </Text>
        <Text size="2" color="muted">
          time here
        </Text>
      </Box>

      {selectors ? (
        <ConversationSelectors
          conversationId={conversationId}
          selectors={selectors}
        />
      ) : null}
      <CommentBlock comment={comment} />
    </Box>
  )
}

function ConversationSelectors({
  selectors,
  conversationId,
}: {
  selectors: Array<Selector>
  conversationId: string
}) {
  let convContext = useConversations()

  let selectorText = useMemo(() => {
    let leafs: Array<PhrasingContent> = []
    selectors.forEach((sel) => {
      let p = convContext.clientSelectors[sel.blockId].children[0]

      p.children.forEach((leaf) => {
        if (
          Array.isArray(leaf.conversations) &&
          leaf.conversations.includes(conversationId)
        ) {
          leafs.push(leaf)
        }
      })
    })

    return leafs.map((l) => l.text).join('')
  }, [convContext.clientSelectors, conversationId, selectors])

  return (
    <Box
      css={{
        userSelect: 'none',
        paddingBlock: '$2',
        position: 'relative',
        paddingInlineStart: '$5',
        paddingInlineEnd: '$4',
        width: '$full',
      }}
    >
      <Box
        css={{
          background: '$highlight-surface3',
          width: 4,
          height: '$full',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
      <Text size="2" color="muted">
        {selectorText}
      </Text>
    </Box>
  )
}

function CommentBlock({comment}: {comment: Block}) {
  return (
    <Box
      css={{
        marginBottom: '$3',
      }}
    >
      <Text alt>{comment.text}</Text>
    </Box>
  )
}

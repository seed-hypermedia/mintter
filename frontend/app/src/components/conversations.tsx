import {useConversations} from '@app/editor/comments/conversations-context'
import {queryKeys} from '@app/hooks'
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
  Document,
  getPublication,
  paragraph,
  Publication,
  statement,
  text,
  transport,
} from '@mintter/shared'
import {ListConversationsResponse} from '@mintter/shared/client/.generated/documents/v1alpha/comments_pb'
import {useQuery, UseQueryResult} from '@tanstack/react-query'
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
          ? (data?.conversations || []).map((conversation) => (
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
        '&:hover': {
          backgroundColor: '$base-background-subtle',
        },
      }}
    >
      <Box as="ul" css={{margin: 0, padding: 0}}>
        <CommentItem
          comment={firstComment}
          selectors={conversation.selectors}
        />
        {comments.map((item) => (
          <CommentItem key={`${item.id}-${item.revision}`} comment={item} />
        ))}
      </Box>
      <Box css={{display: 'flex', paddingBlock: '$4', paddingRight: '$4'}}>
        <CommentSeparator />
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
  comment,
  selectors,
}: {
  comment: Block
  selectors?: Conversation['selectors']
}) {
  return (
    <Box
      as="li"
      css={{
        listStyle: 'none',
        paddingTop: selectors ? '$5' : '$3',
        '&:hover': {
          cursor: 'default',
        },
      }}
    >
      <Box
        css={{
          display: 'flex',
          alignItems: 'center',
          paddingRight: '$5',
        }}
      >
        <Box
          css={{
            // paddingTop: '$3',
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
            paddingInline: '$4',
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
      </Box>
      <Box css={{display: 'flex'}}>
        <CommentSeparator />
        <Box
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: '$4',
            flex: 1,
          }}
        >
          {selectors ? <ConversationSelectors selectors={selectors} /> : null}
          <CommentBlock comment={comment} />
        </Box>
      </Box>
    </Box>
  )
}

function ConversationSelectors({
  selectors,
}: {
  selectors: Conversation['selectors']
}) {
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
        conversation selector HERE
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

type UseQueryBlockParams = {
  documentId: string
  blockId: string
  version?: string
  revision?: string
}

function useQueryBlock({
  documentId,
  version,
  blockId,
  revision,
}: UseQueryBlockParams) {
  let pubQuery = useQuery({
    queryFn: async () => getPublication(documentId, version),
    queryKey: [queryKeys.GET_PUBLICATION, documentId],
    enabled: !!documentId && !!blockId,
  })

  return useMemo(() => {
    let {data} = pubQuery

    if (data) {
      let blockDict = flattenPublicationBlocks(data)

      // TODO: add the revision as another parameter
      return blockDict[blockId]
    }

    return
  }, [pubQuery.data])
}

function flattenPublicationBlocks(publication: Publication) {
  let res: {[key: string]: Block} = {}

  if (publication.document) loopOverList(publication.document.children)

  function loopOverList(list: Document['children']) {
    list.forEach((bn) => {
      if (bn.block) {
        res[bn.block!.id] = bn.block
      }

      if (bn.children.length) loopOverList(bn.children)
    })
  }

  return res
}

function CommentSeparator() {
  return (
    <Box
      css={{
        width: 60,
        padding: '$5',
        height: '$full',
      }}
    />
  )
}

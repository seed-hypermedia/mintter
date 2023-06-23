import {changesClient, commentsClient} from '@app/api-clients'
import {features} from '@app/constants'

import {useAccount} from '@app/models/accounts'
import {useNavigate} from '@app/utils/navigation'
import {Avatar} from '@components/avatar'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {
  Block,
  Conversation,
  formattedDate,
  paragraph,
  PhrasingContent,
  Selector,
  statement,
  text,
} from '@mintter/shared'
import {SizableText, Text, TextArea} from '@mintter/ui'
import {useQuery} from '@tanstack/react-query'
import {FormEvent, useEffect, useMemo, useRef, useState} from 'react'
import toast from 'react-hot-toast'
import {AccessoryContainer} from './accessory-sidebar'

export const ConversationsAccessory = features.comments
  ? EnabledConversationsAccessory
  : () => null

function useConversations(): any {}

export function EnabledConversationsAccessory() {
  const context = useConversations()

  const {documentId, conversations, highlights} = context
  const {data} = conversations || {}

  return (
    <AccessoryContainer title="Conversations">
      {documentId ? (
        data?.length ? (
          data?.map((conversation: any) => (
            <ConversationItem
              isHighlighted={highlights.includes(conversation.id)}
              key={conversation.id}
              conversation={conversation}
            />
          ))
        ) : (
          <SizableText size="$5" fontWeight="700">
            No conversations yet
          </SizableText>
        )
      ) : null}
    </AccessoryContainer>
  )
}

function ConversationItem({
  conversation,
  isHighlighted = false,
}: {
  conversation: Conversation
  isHighlighted: boolean
}) {
  let elRef = useRef<HTMLDivElement>(null)
  let context = useConversations()
  let [firstComment, ...comments] = conversation.comments

  useEffect(() => {
    if (!elRef.current) return

    elRef.current.scrollIntoView({behavior: 'smooth'})
  }, [isHighlighted])

  return (
    <Box
      ref={elRef}
      onClick={() => {
        context.onHighlightConversations([conversation.id])
      }}
      css={{
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        transition: 'all 150ms ease',
        paddingBlock: '$5',
        paddingLeft: 60,
        backgroundColor: isHighlighted ? '$highlight-surface1' : 'transparent',
        '&:hover': {
          backgroundColor: isHighlighted
            ? '$highlight-surface1'
            : '$base-background-subtle',
        },
      }}
    >
      <Box as="ul" css={{margin: 0, padding: 0}}>
        <CommentItem
          conversationId={conversation.id}
          comment={firstComment}
          selectors={conversation.selectors}
        />
        {comments.length ? (
          <Box
            as="li"
            css={{
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '$3',
              width: '$full',
              paddingTop: '$5',
              marginRight: '$4',
              position: 'relative',
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
      <MintterReplyForm
        conversationId={conversation.id}
        onSuccess={() => {
          toast.success('Reply success!')
          context.conversations?.refetch?.()
        }}
      />
    </Box>
  )
}

function MintterReplyForm({
  conversationId,
  onSuccess,
}: {
  conversationId: string
  onSuccess: () => void
}) {
  const [isReplying, setIsReplying] = useState(false)
  const [draft, setDraft] = useState('')

  function submitReply(e: FormEvent) {
    e.preventDefault()
    let comment = draft.replace(/\s/g, ' ')

    commentsClient
      .addComment({
        conversationId,
      })
      .then((res) => {
        onSuccess()
        setDraft('')
        setIsReplying(false)
      })
  }

  if (isReplying)
    return (
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
          <TextArea
            value={draft}
            onChangeText={(val: string) => setDraft(val)}
            id="replyContent"
          />
          <Box
            css={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Button
              onClick={() => {
                setIsReplying(false)
              }}
              color="muted"
              size="1"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button size="1" type="submit" variant="outlined">
              Reply
            </Button>
          </Box>
        </Box>
      </Box>
    )
  return (
    <Box css={{display: 'flex', paddingBlock: '$4', paddingRight: '$4'}}>
      <Button
        onClick={() => {
          setIsReplying(true)
        }}
        color="muted"
        size="1"
        variant="outlined"
      >
        Reply
      </Button>
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
  let changeData = useQuery({
    queryFn: () =>
      changesClient.getChangeInfo({
        id: comment.revision,
      }),
    queryKey: ['ChangeInfo', comment.revision],
  })

  let author = useAccount(changeData.data?.author)

  function deleteComment() {
    commentsClient
      .deleteComment({
        conversationId,
        blockId: comment.id,
      })
      .then((res) => {
        console.log('Comment deleted!', res)
      })
  }
  const navigate = useNavigate()
  const navigateToAuthor = changeData.data?.author
    ? () => navigate({key: 'account', accountId: changeData.data!.author})
    : undefined
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
          cursor: 'pointer',
          paddingLeft: '$5',
        }}
        onClick={navigateToAuthor}
      >
        <Avatar
          accountId={changeData.data?.author}
          size="$2"
          alias={author?.data?.profile?.alias || 'A'}
        />
      </Box>
      <Box
        css={{
          display: 'flex',
          gap: '$6',
          flex: 1,
        }}
      >
        <Button
          css={{
            padding: 0,
            color: '$text-active',
            fontWeight: 'bold',
            fontSize: '$1',
            '&:hover': {
              color: '$text-active',
              textDecoration: 'underline',
            },
          }}
          variant="ghost"
          size="2"
          onClick={navigateToAuthor}
        >
          {author?.data?.profile?.alias}
        </Button>
        <SizableText size="$2">
          {changeData.data?.createTime
            ? formattedDate(changeData.data?.createTime)
            : null}
        </SizableText>
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
      let p = convContext.clientSelectors[sel.blockId]?.children?.[0]
      if (!p) return

      p.children.forEach((leaf) => {
        if (
          //@ts-ignore
          Array.isArray(leaf.conversations) &&
          //@ts-ignore
          leaf.conversations.includes(conversationId)
        ) {
          //@ts-ignore
          leafs.push(leaf)
        }
      })
    })

    //@ts-ignore
    return leafs.map((l) => l.text).join('')
  }, [convContext.clientSelectors, conversationId, selectors])
  if (selectorText === '') return null
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
      <SizableText size="$2">{selectorText}</SizableText>
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
      <Text>{comment.text}</Text>
    </Box>
  )
}

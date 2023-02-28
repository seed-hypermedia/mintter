import {useAccount} from '@app/auth-context'
import {useConversations} from '@app/editor/comments/conversations-context'
import {useAuthor} from '@app/hooks'
import {copyTextToClipboard} from '@app/utils/copy-to-clipboard'
import {EXPERIMENTS} from '@app/utils/experimental'
import {
  useNostr,
  useNostrPostsOnDoc,
  useNostrProfile,
  useNostrReplies,
} from '@app/utils/nostr'
import {createPromiseClient} from '@bufbuild/connect-web'
import {Timestamp} from '@bufbuild/protobuf'
import {Avatar, getRandomColor} from '@components/avatar'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Text} from '@components/text'
import {TextField} from '@components/text-field'
import {
  Block,
  blockToApi,
  Changes,
  Comments,
  Conversation,
  formattedDate,
  paragraph,
  PhrasingContent,
  Selector,
  statement,
  text,
  transport,
} from '@mintter/shared'
import {useQuery} from '@tanstack/react-query'
import {appWindow} from '@tauri-apps/api/window'
import {Event} from 'nostr-relaypool/event'
import {FormEvent, useEffect, useMemo, useRef, useState} from 'react'
import toast from 'react-hot-toast'

export function Conversations() {
  const context = useConversations()

  useEffect(() => {
    let unlisten: () => void | undefined

    return () => unlisten?.()
  }, [])

  const {documentId, conversations, highlights} = context
  const nostrPosts = useNostrPostsOnDoc(documentId)
  const {data} = conversations || {}

  useEffect(() => {
    let isSubscribed = true
    let unlisten: () => void

    appWindow
      .onFocusChanged(({payload: focused}) => {
        if (!isSubscribed) {
          return unlisten()
        }

        if (focused) {
          conversations?.refetch?.()
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
      {EXPERIMENTS.nostr ? (
        <Box
          css={{
            padding: 0,
            margin: 0,
          }}
          as="ul"
        >
          {nostrPosts.isLoading ? <Text>Loading...</Text> : null}
          {nostrPosts.data?.map((post) => {
            return <NostrPostItem post={post} key={post.id} />
          })}
        </Box>
      ) : null}
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
                isHighlighted={highlights.includes(conversation.id)}
                key={conversation.id}
                conversation={conversation}
              />
            ))
          : null}
      </Box>
    </Box>
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
              // paddingTop: selectors ? '$5' : '$3',
              width: '$full',
              paddingTop: '$5',
              marginRight: '$4',
              position: 'relative',
              // paddingLeft: 48,
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

    createPromiseClient(Comments, transport)
      .addComment({
        conversationId,
        comment: blockToApi(statement([paragraph([text(comment)])])),
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
          <TextField
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            name="replyContent"
            textarea
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
      createPromiseClient(Changes, transport).getChangeInfo({
        id: comment.revision,
      }),
  })

  let author = useAuthor(changeData.data?.author)

  function deleteComment() {
    createPromiseClient(Comments, transport)
      .deleteComment({
        conversationId,
        blockId: comment.id,
      })
      .then((res) => {
        console.log('Comment deleted!', res)
      })
  }

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
        <Avatar
          accountId={changeData.data?.author}
          size={2}
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
        <Text size="2" fontWeight="bold">
          {author?.data?.profile?.alias}
        </Text>
        <Text size="2" color="muted">
          {changeData.data?.createTime
            ? formattedDate(changeData.data?.createTime)
            : null}
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

function NostrLeafPost({post}: {post: Event}) {
  const userInfo = useNostrProfile(post.pubkey)
  const displayName = userInfo?.data?.display_name
  return (
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
        '&:hover': {
          cursor: 'default',
        },
      }}
    >
      <Box
        css={{
          position: 'absolute',
          // top: selectors ? 8 : 0,
          top: 8,
          left: 0,
          transform: 'translateX(-100%)',
          paddingBottom: 0,
          paddingLeft: '$5',
        }}
      >
        <Avatar
          url={userInfo?.data?.picture}
          accountId=""
          size={2}
          color={getRandomColor(post.pubkey)}
          alias={post.pubkey.substring(0, 6)}
        />
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
          {displayName || post.pubkey.substring(0, 6)}
        </Text>
        <Text
          size="2"
          color="muted"
          as="a"
          href={'nostr:${post.id}'}
          onClick={(e) => {
            e.preventDefault()
            copyTextToClipboard(`nostr:${post.id}`)
            toast.success('Copied to nostr url to clipboard.')
          }}
        >
          {formattedDate(new Timestamp({seconds: BigInt(post.created_at)}))}
        </Text>
      </Box>

      <Box
        css={{
          // width: '$full',
          paddingInline: '$4',

          boxSizing: 'border-box',
        }}
      >
        <Text css={{display: 'inline-block', wordBreak: 'break-all'}}>
          {/* {post.content.substring(0, 5)} */}
          {post.content}
        </Text>
      </Box>
    </Box>
  )
}

function CommentReplyForm({postId}: {postId: string}) {
  const [isReplying, setIsReplying] = useState(false)
  const [draft, setDraft] = useState('')
  const nostr = useNostr()
  if (isReplying)
    return (
      <Box css={{display: 'flex', paddingBlock: '$4', paddingRight: '$4'}}>
        <Box
          as="form"
          onSubmit={(e) => {
            e.preventDefault()
            const tags = [['e', postId]]
            console.log('HUH', tags)
            nostr?.publish(draft, tags).then(() => {
              toast.success('Nostr reply sent')
              setDraft('')
              setIsReplying(false)
            })
          }}
          css={{
            flex: 1,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '$4',
            flexDirection: 'column',
          }}
        >
          <TextField
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            name="replyContent"
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
              Send Reply
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

function NostrPostItem({post}: {post: Event}) {
  const replies = useNostrReplies(post.id)

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
        <NostrLeafPost post={post} />
        {replies?.data && (
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
              {replies.data.map((post) => (
                <NostrLeafPost key={post.id} post={post} />
              ))}
            </Box>
          </Box>
        )}
      </Box>
      <CommentReplyForm postId={post.id} />
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

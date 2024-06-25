import {isValidUrl} from '@/editor/utils'
import {useOpenUrl} from '@/open-url'
import {TwitterXIcon, XPostNotFound, XPostSkeleton, useTheme} from '@shm/ui'
import {Fragment} from '@tiptap/pm/model'
import {
  QuotedTweet,
  TweetBody,
  TweetHeader,
  TweetInReplyTo,
  TweetInfo,
  TweetMedia,
  enrichTweet,
  useTweet,
} from 'react-tweet'
import {
  Block,
  BlockNoteEditor,
  createReactBlockSpec,
  defaultProps,
} from './blocknote'
import {MediaContainer} from './media-container'
import {DisplayComponentProps, MediaRender, MediaType} from './media-render'
import {HMBlockSchema} from './schema'

export const WebEmbed = createReactBlockSpec({
  type: 'web-embed',
  propSchema: {
    ...defaultProps,
    url: {
      default: '',
    },
    defaultOpen: {
      values: ['false', 'true'],
      default: 'false',
    },
  },
  containsInlineContent: true,

  render: ({
    block,
    editor,
  }: {
    block: Block<HMBlockSchema>
    editor: BlockNoteEditor<HMBlockSchema>
  }) => Render(block, editor),

  parseHTML: [
    {
      tag: 'div[data-content-type=web-embed]',
      priority: 1000,
      getContent: (_node, _schema) => {
        return Fragment.empty
      },
    },
  ],
})

const Render = (
  block: Block<HMBlockSchema>,
  editor: BlockNoteEditor<HMBlockSchema>,
) => {
  const theme = useTheme()

  const submitTwitterLink = (url: string, assign: any, setFileName: any) => {
    if (isValidUrl(url)) {
      if (url.includes('twitter') || url.includes('x.com')) {
        assign({props: {url: url}} as MediaType)
      } else {
        setFileName({
          name: `The provided URL is not a twitter URL`,
          color: 'red',
        })
        return
      }
    } else setFileName({name: 'The provided URL is invalid.', color: 'red'})
    const cursorPosition = editor.getTextCursorPosition()
    editor.focus()
    if (cursorPosition.block.id === block.id) {
      if (cursorPosition.nextBlock)
        editor.setTextCursorPosition(cursorPosition.nextBlock, 'start')
      else {
        editor.insertBlocks(
          [{type: 'paragraph', content: ''}],
          block.id,
          'after',
        )
        editor.setTextCursorPosition(
          editor.getTextCursorPosition().nextBlock!,
          'start',
        )
      }
    }
  }
  return (
    <MediaRender
      block={block}
      editor={editor}
      mediaType="web-embed"
      submit={submitTwitterLink}
      DisplayComponent={display}
      icon={<TwitterXIcon fill={theme.color12.get()} />}
    />
  )
}

const display = ({
  editor,
  block,
  selected,
  setSelected,
  assign,
}: DisplayComponentProps) => {
  const urlArray = block.props.url.split('/')
  const xPostId = urlArray[urlArray.length - 1].split('?')[0]
  const {data, error, isLoading} = useTweet(xPostId)
  const openUrl = useOpenUrl()

  let xPostContent

  if (isLoading) xPostContent = <XPostSkeleton />
  else if (error || !data) {
    xPostContent = <XPostNotFound error={error} />
  } else {
    const xPost = enrichTweet(data)
    xPostContent = (
      <>
        <TweetHeader tweet={xPost} />
        {xPost.in_reply_to_status_id_str && <TweetInReplyTo tweet={xPost} />}
        <TweetBody tweet={xPost} />
        {xPost.mediaDetails?.length ? <TweetMedia tweet={xPost} /> : null}
        {xPost.quoted_tweet && <QuotedTweet tweet={xPost.quoted_tweet} />}
        <TweetInfo tweet={xPost} />
      </>
    )
  }

  return (
    <MediaContainer
      editor={editor}
      block={block}
      mediaType="web-embed"
      selected={selected}
      setSelected={setSelected}
      assign={assign}
      onPress={() => {
        openUrl(block.props.ref)
      }}
      styleProps={{
        padding: '$3',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
        fontWeight: '400',
      }}
      className="x-post-container"
    >
      {xPostContent}
    </MediaContainer>
  )
}

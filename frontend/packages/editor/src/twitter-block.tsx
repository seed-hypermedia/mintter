import {Skeleton} from '@mantine/core'
import {YStack, useTheme} from '@mintter/ui'
import {RiTwitterLine} from 'react-icons/ri'
import {
  QuotedTweet,
  TweetBody,
  TweetHeader,
  TweetInReplyTo,
  TweetInfo,
  TweetMedia,
  TweetNotFound,
  TweetProps,
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
import {isValidUrl} from './utils'

export const TwitterBlock = createReactBlockSpec({
  type: 'twitterBlock',
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
})

const Render = (
  block: Block<HMBlockSchema>,
  editor: BlockNoteEditor<HMBlockSchema>,
) => {
  const theme = useTheme()

  const submitTwitterLink = async (
    url: string,
    assign: any,
    setFileName: any,
  ) => {
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
      mediaType="twitterBlock"
      submit={submitTwitterLink}
      DisplayComponent={display}
      icon={<RiTwitterLine fill={theme.color12.get()} />}
    />
  )
}

const TweetEmbed = ({id, apiUrl, components, onError}: TweetProps) => {
  const {data, error, isLoading} = useTweet(id, apiUrl)

  if (isLoading)
    return (
      <YStack padding="$2" width={'100%'} height={'100%'}>
        <Skeleton width={'100%'} height={'100%'} />
      </YStack>
    )
  if (error || !data) {
    const NotFound = components?.TweetNotFound || TweetNotFound
    return <NotFound error={onError ? onError(error) : error} />
  }

  const tweet = enrichTweet(data)

  return (
    <YStack>
      <TweetHeader tweet={tweet} components={components} />
      {tweet.in_reply_to_status_id_str && <TweetInReplyTo tweet={tweet} />}
      <TweetBody tweet={tweet} />
      {tweet.mediaDetails?.length ? (
        <TweetMedia tweet={tweet} components={components} />
      ) : null}
      {tweet.quoted_tweet && <QuotedTweet tweet={tweet.quoted_tweet} />}
      <TweetInfo tweet={tweet} />
    </YStack>
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
  const tweetId = urlArray[urlArray.length - 1].split('?')[0]
  return (
    <MediaContainer
      editor={editor}
      block={block}
      mediaType="twitterBlock"
      selected={selected}
      setSelected={setSelected}
      assign={assign}
      styleProps={{
        padding: '$3',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
        fontWeight: '400',
      }}
      className="tweet-container"
    >
      <TweetEmbed id={tweetId} />
    </MediaContainer>
  )
}

import {SizableText, XStack, useTheme} from '@mintter/ui'
import {RiVideoAddLine} from 'react-icons/ri'
import {
  Block,
  BlockNoteEditor,
  createReactBlockSpec,
  defaultProps,
} from './blocknote'
import {DisplayComponentProps, MediaRender, MediaType} from './media-render'
import {HMBlockSchema} from './schema'
import {youtubeParser} from './utils'

export const getSourceType = (name: string) => {
  const nameArray = name.split('.')
  return nameArray[nameArray.length - 1]
    ? `video/${nameArray[nameArray.length - 1]}`
    : undefined
}

export const VideoBlock = createReactBlockSpec({
  type: 'video',
  propSchema: {
    ...defaultProps,
    url: {
      default: '',
    },
    src: {
      default: '',
    },
    name: {
      default: '',
    },
    defaultOpen: {
      values: ['false', 'true'],
      default: 'false',
    },
  },
  containsInlineContent: true,
  // @ts-ignore
  render: ({
    block,
    editor,
  }: {
    block: Block<HMBlockSchema>
    editor: BlockNoteEditor<HMBlockSchema>
  }) => Render(block, editor),
})

const isValidUrl = (urlString: string) => {
  try {
    return Boolean(new URL(urlString))
  } catch (e) {
    console.log(e)
    return false
  }
}

const Render = (
  block: Block<HMBlockSchema>,
  editor: BlockNoteEditor<HMBlockSchema>,
) => {
  const theme = useTheme()
  const submitVideo = async (url: string, assign: any, setFileName: any) => {
    if (isValidUrl(url)) {
      let embedUrl = 'https://www.youtube.com/embed/'
      if (url.includes('youtu.be') || url.includes('youtube')) {
        let ytId = youtubeParser(url)
        if (ytId) {
          embedUrl = embedUrl + ytId
        } else {
          setFileName({name: `Unsupported Youtube Url:${url}`, color: 'red'})
          return
        }
      } else if (url.includes('vimeo')) {
        const urlArray = url.split('/')
        embedUrl = `https://player.vimeo.com/video/${
          urlArray[urlArray.length - 1]
        }`
      } else {
        setFileName({name: 'Unsupported video source.', color: 'red'})
        return
      }
      assign({props: {url: embedUrl}} as MediaType)
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
      mediaType="video"
      submit={submitVideo}
      DisplayComponent={display}
      icon={<RiVideoAddLine fill={theme.color12.get()} />}
    />
  )
}

const display = ({editor, block, url}: DisplayComponentProps) => {
  return (
    <>
      {block.props.url.startsWith('ipfs://') ? (
        <XStack
          tag="video"
          //@ts-expect-error
          contentEditable={false}
          playsInline
          controls
          preload="metadata"
          top={0}
          left={0}
          position="absolute"
          width="100%"
          height="100%"
        >
          <source src={url} type={getSourceType(block.props.name)} />
          <SizableText>Something is wrong with the video file.</SizableText>
        </XStack>
      ) : (
        <XStack
          pointerEvents={editor.isEditable ? 'none' : 'auto'}
          tag="iframe"
          position="absolute"
          className="video-iframe"
          top={0}
          left={0}
          bottom={0}
          right={0}
          // @ts-expect-error
          src={block.props.url}
          frameBorder="0"
          allowFullScreen
        />
      )}
    </>
  )
}

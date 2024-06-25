import {isValidUrl, youtubeParser} from '@/editor/utils'
import {API_FILE_URL} from '@shm/shared'
import {ResizeHandle, SizableText, XStack, useTheme} from '@shm/ui'
import {useEffect, useState} from 'react'
import {RiVideoAddLine} from 'react-icons/ri'
import {
  Block,
  BlockNoteEditor,
  createReactBlockSpec,
  defaultProps,
} from './blocknote'
import {MediaContainer} from './media-container'
import {DisplayComponentProps, MediaRender, MediaType} from './media-render'
import {HMBlockSchema} from './schema'

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
    width: {
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

  parseHTML: [
    {
      tag: 'video[src]',
      getAttrs: (element) => {
        return {src: element.getAttribute('src')}
      },
    },
    {
      tag: 'iframe',
      getAttrs: (element) => {
        return {src: element.getAttribute('src')}
      },
    },
  ],
})

const Render = (
  block: Block<HMBlockSchema>,
  editor: BlockNoteEditor<HMBlockSchema>,
) => {
  const theme = useTheme()
  const submitVideo = (url: string, assign: any, setFileName: any) => {
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

const display = ({
  editor,
  block,
  selected,
  setSelected,
  assign,
}: DisplayComponentProps) => {
  // Min video width in px.
  const minWidth = 256
  let width: number =
    parseFloat(block.props.width) ||
    editor.domElement.firstElementChild!.clientWidth
  const [currentWidth, setCurrentWidth] = useState(width)
  const [showHandle, setShowHandle] = useState(false)
  let resizeParams:
    | {
        handleUsed: 'left' | 'right'
        initialWidth: number
        initialClientX: number
      }
    | undefined

  useEffect(() => {
    if (block.props.width) {
      width = parseFloat(block.props.width)
      setCurrentWidth(parseFloat(block.props.width))
    }
  }, [block.props.width])

  const windowMouseMoveHandler = (event: MouseEvent) => {
    if (!resizeParams) {
      return
    }

    let newWidth: number
    if (resizeParams.handleUsed === 'left') {
      newWidth =
        resizeParams.initialWidth +
        (resizeParams.initialClientX - event.clientX) * 2
    } else {
      newWidth =
        resizeParams.initialWidth +
        (event.clientX - resizeParams.initialClientX) * 2
    }

    // Ensures the video is not wider than the editor and not smaller than a
    // predetermined minimum width.
    if (newWidth < minWidth) {
      width = minWidth
      setCurrentWidth(minWidth)
    } else if (newWidth > editor.domElement.firstElementChild!.clientWidth) {
      width = editor.domElement.firstElementChild!.clientWidth
      setCurrentWidth(editor.domElement.firstElementChild!.clientWidth)
    } else {
      width = newWidth
      setCurrentWidth(newWidth)
    }
  }

  // Stops mouse movements from resizing the video and updates the block's
  // `width` prop to the new value.
  const windowMouseUpHandler = (event: MouseEvent) => {
    setShowHandle(false)

    if (!resizeParams) {
      return
    }
    resizeParams = undefined

    assign({
      props: {
        width: width.toString(),
      },
    })

    // @ts-expect-error
    editor.updateBlock(block.id, {
      ...block,
      props: {
        width: width.toString(),
      },
    })
  }
  window.addEventListener('mousemove', windowMouseMoveHandler)
  window.addEventListener('mouseup', windowMouseUpHandler)

  // Hides the resize handles when the cursor leaves the video
  const videoMouseLeaveHandler = (event) => {
    if (resizeParams) {
      return
    }

    setShowHandle(false)
  }

  // Sets the resize params, allowing the user to begin resizing the video by
  // moving the cursor left or right.
  const leftResizeHandleMouseDownHandler = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    event.preventDefault()

    setShowHandle(true)

    resizeParams = {
      handleUsed: 'left',
      initialWidth: width || parseFloat(block.props.width),
      initialClientX: event.clientX,
    }
    editor.setTextCursorPosition(block.id, 'start')
  }

  const rightResizeHandleMouseDownHandler = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    event.preventDefault()

    setShowHandle(true)

    resizeParams = {
      handleUsed: 'right',
      initialWidth: width || parseFloat(block.props.width),
      initialClientX: event.clientX,
    }
    editor.setTextCursorPosition(block.id, 'start')
  }

  const videoProps = {
    paddingBottom: '56.25%',
    position: 'relative',
    height: 0,
  }

  return (
    <MediaContainer
      editor={editor}
      block={block}
      mediaType="video"
      styleProps={videoProps}
      selected={selected}
      setSelected={setSelected}
      assign={assign}
      onHoverIn={() => {
        if (editor.isEditable) {
          setShowHandle(true)
        }
      }}
      onHoverOut={videoMouseLeaveHandler}
      width={currentWidth}
    >
      {showHandle && (
        <>
          <ResizeHandle
            left={4}
            onMouseDown={leftResizeHandleMouseDownHandler}
          />
          <ResizeHandle
            right={4}
            onMouseDown={rightResizeHandleMouseDownHandler}
          />
        </>
      )}
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
          <source
            src={`${API_FILE_URL}/${block.props.url.replace('ipfs://', '')}`}
            type={getSourceType(block.props.name)}
          />
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
    </MediaContainer>
  )
}

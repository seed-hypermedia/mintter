import { isValidUrl, timeoutPromise } from '@/editor/utils'
import { getCIDFromIPFSUrl, useDocContentContext } from '@shm/shared'
import { ResizeHandle, useTheme } from '@shm/ui'
import { useEffect, useState } from 'react'
import { RiImage2Line } from 'react-icons/ri'
import {
  Block,
  BlockNoteEditor,
  createReactBlockSpec,
  defaultProps,
} from './blocknote'
import { MediaContainer } from './media-container'
import { DisplayComponentProps, MediaRender, MediaType } from './media-render'
import { HMBlockSchema } from './schema'

export const ImageBlock = createReactBlockSpec({
  type: 'image',
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

  render: ({
    block,
    editor,
  }: {
    block: Block<HMBlockSchema>
    editor: BlockNoteEditor<HMBlockSchema>
  }) => Render(block, editor),

  parseHTML: [
    {
      tag: 'img[src]',
      getAttrs: (element) => {
        return { src: element.getAttribute('src'), width: element.style.width }
      },
      node: 'image',
    },
  ],
})

const Render = (
  block: Block<HMBlockSchema>,
  editor: BlockNoteEditor<HMBlockSchema>,
) => {
  const theme = useTheme()
  const { importWebFile } = useDocContentContext()

  const submitImage = (
    url: string,
    assign: any,
    setFileName: any,
    setLoading: any,
  ) => {
    console.log('--- importWebFile', importWebFile)
    if (isValidUrl(url)) {
      setLoading(true)
      timeoutPromise(importWebFile.mutateAsync(url), 5000, {
        reason: 'Error fetching the image.',
      })
        .then((imageData) => {
          setLoading(false)
          if (imageData?.cid) {
            if (!imageData.type.includes('image')) {
              setFileName({
                name: 'The provided URL is not an image.',
                color: 'red',
              })
              return
            }
            assign({ props: { url: `ipfs://${imageData.cid}` } } as MediaType)
            setLoading(false)
          } else {
            let imgTypeSplit = imageData.type.split('/')
            setFileName({
              name: `uploadedImage.${imgTypeSplit[imgTypeSplit.length - 1]}`,
              color: 'red',
            })
            setLoading(false)
          }
        })
        .catch((e) => {
          setFileName({
            name: e.reason,
            color: 'red',
          })
          setLoading(false)
        })
    } else setFileName({ name: 'The provided URL is invalid.', color: 'red' })

    const cursorPosition = editor.getTextCursorPosition()
    editor.focus()
    if (cursorPosition.block.id === block.id) {
      if (cursorPosition.nextBlock)
        editor.setTextCursorPosition(cursorPosition.nextBlock, 'start')
      else {
        editor.insertBlocks(
          [{ type: 'paragraph', content: '' }],
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
      mediaType="image"
      submit={submitImage}
      DisplayComponent={display}
      icon={<RiImage2Line fill={theme.color12.get()} />}
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
  const { ipfsBlobPrefix } = useDocContentContext()
  const imageUrl = block.props.url.includes('.')
    ? null
    : `${ipfsBlobPrefix}${getCIDFromIPFSUrl(block.props.url)}`
  // Min image width in px.
  const minWidth = 64
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

    // Ensures the image is not wider than the editor and not smaller than a
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

  // Stops mouse movements from resizing the image and updates the block's
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

  // Hides the resize handles when the cursor leaves the image
  const imageMouseLeaveHandler = (event) => {
    if (resizeParams) {
      return
    }

    setShowHandle(false)
  }

  // Sets the resize params, allowing the user to begin resizing the image by
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

  return (
    <MediaContainer
      editor={editor}
      block={block}
      mediaType="image"
      selected={selected}
      setSelected={setSelected}
      assign={assign}
      onHoverIn={() => {
        if (editor.isEditable) {
          setShowHandle(true)
        }
      }}
      onHoverOut={imageMouseLeaveHandler}
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
      {imageUrl && (
        <img
          style={{ width: `100%` }}
          src={imageUrl}
          alt={block.props.name || 'image'}
          contentEditable={false}
        />
      )}
    </MediaContainer>
  )
}

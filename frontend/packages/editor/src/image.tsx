import {trpc} from '@mintter/desktop/src/trpc'
import {getCIDFromIPFSUrl, usePublicationContentContext} from '@mintter/shared'
import {useTheme} from '@mintter/ui'
import {RiImage2Line} from 'react-icons/ri'
import {
  Block,
  BlockNoteEditor,
  createReactBlockSpec,
  defaultProps,
} from './blocknote'
import {DisplayComponentProps, MediaRender, MediaType} from './media-render'
import {HMBlockSchema} from './schema'

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
  const upload = trpc.webImporting.importWebFile.useMutation()
  const submitImage = async (url: string, assign: any, setFileName: any) => {
    if (isValidUrl(url)) {
      const imageData = await upload.mutateAsync(url)
      if (imageData?.cid) {
        if (!imageData.type.includes('image')) {
          setFileName({name: 'The provided URL is not an image.', color: 'red'})
          return
        }
        assign({props: {url: `ipfs://${imageData.cid}`}} as MediaType)
      } else {
        let imgTypeSplit = imageData.type.split('/')
        setFileName({
          name: `uploadedImage.${imgTypeSplit[imgTypeSplit.length - 1]}`,
          color: 'red',
        })
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
      mediaType="image"
      submit={submitImage}
      DisplayComponent={display}
      icon={<RiImage2Line fill={theme.color12.get()} />}
    />
  )
}

const display = ({block}: DisplayComponentProps) => {
  const {ipfsBlobPrefix} = usePublicationContentContext()
  const imageUrl = block.props.url.includes('.')
    ? null
    : `${ipfsBlobPrefix}${getCIDFromIPFSUrl(block.props.url)}`
  return (
    <>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={block.props.name || 'image'}
          contentEditable={false}
        />
      )}
    </>
  )
}

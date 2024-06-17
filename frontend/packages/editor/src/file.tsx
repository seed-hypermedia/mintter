import {formatBytes} from '@shm/shared'
import {Button, File, SizableText} from '@shm/ui'
import {Block, BlockNoteEditor, defaultProps} from './blocknote/core'
import {createReactBlockSpec} from './blocknote/react'
import {MediaContainer} from './media-container'
import {DisplayComponentProps, MediaRender} from './media-render'
import {HMBlockSchema} from './schema'

export const MaxFileSizeMB = 150
export const MaxFileSizeB = MaxFileSizeMB * 1024 * 1024

export const FileBlock = createReactBlockSpec({
  type: 'file',
  propSchema: {
    ...defaultProps,

    url: {
      default: '',
    },
    name: {
      default: '',
    },
    src: {
      default: '',
    },
    defaultOpen: {
      values: ['false', 'true'],
      default: 'false',
    },
    size: {
      default: '0',
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

const Render = (
  block: Block<HMBlockSchema>,
  editor: BlockNoteEditor<HMBlockSchema>,
) => {
  return (
    <MediaRender
      block={block}
      editor={editor}
      mediaType="file"
      DisplayComponent={display}
      icon={<File />}
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
  return (
    <MediaContainer
      editor={editor}
      block={block}
      mediaType="file"
      selected={selected}
      setSelected={setSelected}
      assign={assign}
    >
      <Button
        borderRadius={1}
        size="$5"
        fontSize="$4"
        flex={1}
        justifyContent="flex-start"
        icon={<File />}
        disabled
      >
        <SizableText
          size="$5"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          userSelect="text"
          flex={1}
        >
          {block.props.name}
        </SizableText>
        <SizableText paddingTop="$1" color="$color10" size="$2">
          {formatBytes(parseInt(block.props.size))}
        </SizableText>
      </Button>
    </MediaContainer>
  )
}

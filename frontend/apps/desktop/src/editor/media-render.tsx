import { API_FILE_UPLOAD_URL, useDocContentContext } from '@shm/shared'
import {
  Button,
  Form,
  Input,
  Label,
  SizableText,
  Spinner,
  XStack,
  YStack,
} from '@shm/ui'
import { ChangeEvent, FunctionComponent, useEffect, useState } from 'react'
import { RiUpload2Fill } from 'react-icons/ri'
import { Block, BlockNoteEditor, getBlockInfoFromPos } from './blocknote'
import { MaxFileSizeB, MaxFileSizeMB } from './file'
import { HMBlockSchema } from './schema'

export type MediaType = {
  id: string
  props: {
    url: string
    name: string
    size?: string
    display?: 'content' | 'card'
    width?: string
  }
  children: []
  content: []
  type: string
}

const boolRegex = new RegExp('true')

export interface DisplayComponentProps {
  editor: BlockNoteEditor<HMBlockSchema>
  block: Block<HMBlockSchema>
  selected: boolean
  setSelected: any
  assign?: any
}

interface RenderProps {
  block: Block<HMBlockSchema>
  editor: BlockNoteEditor<HMBlockSchema>
  mediaType: string
  submit?: (
    url: string,
    assign,
    setFileName,
    setLoading,
  ) => Promise<void> | void | undefined
  icon: JSX.Element | FunctionComponent<{ color?: string; size?: number }>
  DisplayComponent: React.ComponentType<DisplayComponentProps>
}

export const MediaRender: React.FC<RenderProps> = ({
  block,
  editor,
  mediaType,
  submit,
  DisplayComponent,
  icon,
}) => {
  const [selected, setSelected] = useState(false)
  const [uploading, setUploading] = useState(false)
  const tiptapEditor = editor._tiptapEditor
  const selection = tiptapEditor.state.selection
  const hasSrc = !!block.props.src
  const { importWebFile } = useDocContentContext()

  useEffect(() => {
    const selectedNode = getBlockInfoFromPos(
      tiptapEditor.state.doc,
      tiptapEditor.state.selection.from,
    )
    if (selectedNode && selectedNode.id) {
      if (
        selectedNode.id === block.id &&
        selectedNode.startPos === selection.$anchor.pos
      ) {
        setSelected(true)
      } else if (selectedNode.id !== block.id) {
        setSelected(false)
      }
    }
  }, [selection, block.id])

  useEffect(() => {
    if (!uploading && hasSrc) {
      setUploading(true)

      importWebFile.mutateAsync(block.props.src).then(({ cid, size }) => {
        setUploading(false)
        editor.updateBlock(block, {
          props: {
            url: `ipfs://${cid}`,
            size: size.toString(),
            src: '',
          },
        })
      })
    }
  }, [hasSrc, block, uploading, editor])

  const assignMedia = (newFile: MediaType) => {
    editor.updateBlock(block.id, {
      props: { ...block.props, ...newFile.props },
    })
  }

  const setSelection = (isSelected: boolean) => {
    setSelected(isSelected)
  }

  if (hasSrc || uploading) {
    // this means we have a URL in the props.url that is not starting with `ipfs://`, which means we are uploading the image to IPFS
    return (
      <Button
        // @ts-ignore
        contentEditable={false}
        borderRadius={0}
        size="$5"
        justifyContent="flex-start"
        backgroundColor="$color4"
        width="100%"
      >
        uploading...
      </Button>
    )
  }

  return (
    <YStack>
      {block.props.url ? (
        <MediaComponent
          block={block}
          editor={editor}
          assign={assignMedia}
          selected={selected}
          setSelected={setSelection}
          DisplayComponent={DisplayComponent}
        />
      ) : editor.isEditable ? (
        <MediaForm
          block={block}
          assign={assignMedia}
          editor={editor}
          selected={selected}
          mediaType={mediaType}
          submit={submit}
          icon={icon}
        />
      ) : (
        <></>
      )}
    </YStack>
  )
}

function MediaComponent({
  block,
  editor,
  assign,
  selected,
  setSelected,
  DisplayComponent,
}: {
  block: Block<HMBlockSchema>
  editor: BlockNoteEditor<HMBlockSchema>
  assign: any
  selected: boolean
  setSelected: any
  DisplayComponent: React.ComponentType<DisplayComponentProps>
}) {
  return (
    <DisplayComponent
      editor={editor}
      block={block}
      selected={selected}
      setSelected={setSelected}
      assign={assign}
    />
  )
}

function MediaForm({
  block,
  assign,
  editor,
  selected = false,
  mediaType,
  submit,
  icon,
}: {
  block: Block<HMBlockSchema>
  assign: any
  editor: BlockNoteEditor<HMBlockSchema>
  selected: boolean
  mediaType: string
  submit?: (
    url: string,
    assign,
    setFileName,
    setLoading,
  ) => Promise<void> | void | undefined
  icon: JSX.Element | FunctionComponent<{ color?: string; size?: number }> | null
}) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const isEmbed = ['embed', 'web-embed'].includes(mediaType)
  const [fileName, setFileName] = useState<{
    name: string
    color: string | undefined
  }>({
    name: 'Upload File',
    color: undefined,
  })
  const [drag, setDrag] = useState(false)
  const dragProps = {
    onDrop: (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (drag) setDrag(false)
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        if (mediaType === 'file') {
          const files = Array.from(e.dataTransfer.files)
          handleUpload(Array.from(files))
          return
        }
        let isMedia = true
        const files = Array.from(e.dataTransfer.files)
        files.forEach((file) => {
          if (!file.type.includes(`${mediaType}/`)) {
            setFileName({
              name: `File ${file.name.length < 36
                  ? file.name
                  : file.name.slice(0, 32) + '...'
                } is not ${mediaType === 'image' ? 'an' : 'a'} ${mediaType}.`,
              color: 'red',
            })
            isMedia = false
            return
          }
        })
        if (isMedia) handleUpload(Array.from(files))
        return
      }
    },
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
    },
    onDragEnter: (e: React.DragEvent<HTMLDivElement>) => {
      const relatedTarget = e.relatedTarget as HTMLElement
      e.preventDefault()
      e.stopPropagation()
      if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
        setDrag(true)
      }
    },
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
      const relatedTarget = e.relatedTarget as HTMLElement
      e.preventDefault()
      e.stopPropagation()
      if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
        setDrag(false)
      }
    },
  }

  const handleUpload = async (files: File[]) => {
    const largeFileIndex = files.findIndex((file) => file.size > MaxFileSizeB)
    if (largeFileIndex > -1) {
      const largeFile = files[largeFileIndex]
      setFileName({
        name:
          largeFileIndex > 0
            ? `The size of ${largeFile.name.length < 36
              ? largeFile.name
              : largeFile.name.slice(0, 32) + '...'
            } exceeds ${MaxFileSizeMB} MB.`
            : `The file size exceeds ${MaxFileSizeMB} MB.`,
        color: 'red',
      })
      return
    }

    const { name } = files[0]
    const formData = new FormData()
    formData.append('file', files[0])

    try {
      const response = await fetch(API_FILE_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      })
      const data = await response.text()
      assign({
        props: {
          url: data ? `ipfs://${data}` : '',
          name: name,
          size: mediaType === 'file' ? files[0].size.toString() : undefined,
        },
      } as MediaType)
    } catch (error) {
      console.error(`Editor: ${mediaType} upload error (MediaForm): ${error}`)
    }
    for (let i = files.length - 1; i > 0; i--) {
      const { name } = files[i]
      const formData = new FormData()
      formData.append('file', files[i])

      try {
        const response = await fetch(API_FILE_UPLOAD_URL, {
          method: 'POST',
          body: formData,
        })
        const data = await response.text()
        assign({
          props: {
            url: data ? `ipfs://${data}` : '',
            name: name,
            size: mediaType === 'file' ? files[0].size.toString() : undefined,
          },
        } as MediaType)
      } catch (error) {
        console.error(
          `Editor: ${mediaType} upload error (MediaForm forloop): ${error}`,
        )
      }
    }
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
    <YStack
      position="relative"
      borderWidth={2.5}
      borderColor={drag ? '$color12' : '$color6'}
      borderRadius="$2"
      borderStyle={drag ? 'dashed' : 'solid'}
      outlineWidth={0}
      // @ts-ignore
      contentEditable={false}
      {...(isEmbed ? {} : dragProps)}
    >
      {drag && !isEmbed && (
        <XStack
          width="100%"
          height="100%"
          position="absolute"
          top={0}
          left={0}
          zIndex={999}
          alignItems="center"
          justifyContent="center"
          backgroundColor="rgb(255, 255, 255, 0.5)"
          borderRadius="$2"
        >
          <SizableText fontWeight="bold">DROP MEDIA HERE</SizableText>
        </XStack>
      )}
      <XStack
        padding="$4"
        alignItems="center"
        backgroundColor="$background"
        borderRadius="$2"
      >
        {mediaType !== 'file' ? (
          <Form
            width="100%"
            onSubmit={() => {
              if (submit !== undefined) {
                submit(url, assign, setFileName, setLoading)
              }
            }}
            borderWidth={0}
          >
            <XStack flex={1} gap="$3">
              <Input
                unstyled
                borderColor="$color8"
                borderWidth="$1"
                borderRadius="$2"
                paddingLeft="$3"
                height="$3"
                width="100%"
                placeholder={`Input ${mediaType === 'web-embed' ? 'X.com' : mediaType
                  } URL here...`}
                hoverStyle={{
                  borderColor: '$color11',
                }}
                focusStyle={{
                  borderColor: '$color11',
                }}
                onChange={(e) => {
                  setUrl(e.nativeEvent.text)
                  if (fileName.color)
                    setFileName({
                      name: 'Upload File',
                      color: undefined,
                    })
                }}
                autoFocus={true}
              />
              <Form.Trigger asChild>
                <Button
                  unstyled
                  alignItems="center"
                  justifyContent="center"
                  width="$12"
                  flex={0}
                  flexShrink={0}
                  borderWidth="0"
                  borderRadius="$2"
                  size="$3"
                  fontWeight="bold"
                  backgroundColor={
                    fileName.color === 'red' ? '$color10' : '$color12'
                  }
                  color="$color1"
                  disabled={fileName.color === 'red' ? true : false}
                  hoverStyle={
                    fileName.color !== 'red'
                      ? {
                        backgroundColor: '$color11',
                        cursor: 'pointer',
                      }
                      : { cursor: 'auto' }
                  }
                >
                  {loading ? (
                    <Spinner
                      size="small"
                      color="$green9"
                      paddingHorizontal="$3"
                    />
                  ) : (
                    'UPLOAD'
                  )}
                </Button>
              </Form.Trigger>
              {!isEmbed && (
                <>
                  <Label
                    htmlFor={'file-upload' + block.id}
                    borderColor="$color8"
                    borderRadius="$2"
                    borderWidth="$0.5"
                    width="$8"
                    justifyContent="center"
                    hoverStyle={{
                      backgroundColor: '$borderColorHover',
                      cursor: 'pointer',
                    }}
                  >
                    <RiUpload2Fill />
                  </Label>
                  <input
                    id={'file-upload' + block.id}
                    type="file"
                    multiple
                    accept={mediaType !== 'file' ? `${mediaType}/*` : undefined}
                    style={{
                      background: 'white',
                      padding: '0 2px',
                      display: 'none',
                    }}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      if (event.target.files) {
                        handleUpload(Array.from(event.target.files))
                      }
                    }}
                  />
                </>
              )}
            </XStack>
            {fileName.name != 'Upload File' && (
              <SizableText size="$2" color={fileName.color} paddingTop="$2">
                {fileName.name}
              </SizableText>
            )}
          </Form>
        ) : (
          <XStack
            alignItems="center"
            backgroundColor="$background"
            width="100%"
            height="$3"
          >
            <Label
              htmlFor={'file-upload' + block.id}
              borderColor="$color12"
              borderWidth="$0.5"
              width="100%"
              height="$3"
              justifyContent="center"
              hoverStyle={{
                backgroundColor: '$borderColorHover',
                cursor: 'pointer',
              }}
              gap={3}
            >
              {!drag && (
                <>
                  <RiUpload2Fill size="18" />
                  <SizableText
                    padding="$2"
                    overflow="hidden"
                    whiteSpace="nowrap"
                    textOverflow="ellipsis"
                  >
                    Upload File
                  </SizableText>
                </>
              )}
            </Label>
            <input
              id={'file-upload' + block.id}
              type="file"
              multiple
              style={{
                background: 'white',
                padding: '0 2px',
                display: 'none',
              }}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                if (event.target.files) {
                  handleUpload(Array.from(event.target.files))
                }
              }}
            />
          </XStack>
        )}
      </XStack>
    </YStack>
  )
}

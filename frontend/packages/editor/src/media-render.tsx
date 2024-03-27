import {client} from '@mintter/desktop/src/trpc'
import {API_FILE_UPLOAD_URL} from '@mintter/shared'
import {
  Button,
  Form,
  Input,
  Label,
  Popover,
  SizableText,
  Spinner,
  Tabs,
  XStack,
  YStack,
} from '@mintter/ui'
import {ChangeEvent, FunctionComponent, useEffect, useState} from 'react'
import {Block, BlockNoteEditor, getBlockInfoFromPos} from './blocknote'
import {MaxFileSizeB, MaxFileSizeMB} from './file'
import {HMBlockSchema} from './schema'

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
  ) => Promise<void> | undefined
  icon: JSX.Element | FunctionComponent<{color?: string; size?: number}>
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

      client.webImporting.importWebFile
        .mutate(block.props.src)
        .then(({cid, size}) => {
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
      props: {...block.props, ...newFile.props},
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
    <YStack overflow="hidden">
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
  ) => Promise<void> | undefined
  icon: JSX.Element | FunctionComponent<{color?: string; size?: number}> | null
}) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const isEmbed = ['embed', 'web-embed'].includes(mediaType)
  const [tabState, setTabState] = useState(isEmbed ? 'embed' : 'upload')
  const [fileName, setFileName] = useState<{
    name: string
    color: string | undefined
  }>({
    name: 'Upload File',
    color: undefined,
  })
  const [drag, setDrag] = useState(false)

  const handleUpload = async (files: File[]) => {
    const largeFileIndex = files.findIndex((file) => file.size > MaxFileSizeB)
    if (largeFileIndex > -1) {
      const largeFile = files[largeFileIndex]
      setFileName({
        name:
          largeFileIndex > 0
            ? `The size of ${
                largeFile.name.length < 36
                  ? largeFile.name
                  : largeFile.name.slice(0, 32) + '...'
              } exceeds ${MaxFileSizeMB} MB.`
            : `The file size exceeds ${MaxFileSizeMB} MB.`,
        color: 'red',
      })
      return
    }

    const {name} = files[0]
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
      const {name} = files[i]
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
    <YStack
      //@ts-ignore
      contentEditable={false}
      position="relative"
      borderWidth={2}
      outlineWidth={0}
    >
      <Popover
        placement="bottom"
        size="$5"
        defaultOpen={boolRegex.test(block.props.defaultOpen)}
        stayInFrame
      >
        <Popover.Trigger asChild>
          <Button
            icon={icon}
            borderRadius={0}
            size="$5"
            justifyContent="flex-start"
            backgroundColor="$color3"
            hoverStyle={{
              backgroundColor: '$color4',
            }}
          >
            {`Add ${
              ['embed', 'image', 'web-embed'].includes(mediaType) ? 'an' : 'a'
            } ${
              mediaType === 'web-embed'
                ? 'X Post embed'
                : mediaType.charAt(0).toUpperCase() + mediaType.slice(1)
            }`}
          </Button>
        </Popover.Trigger>
        <Popover.Content
          padding={0}
          elevation="$3"
          overflow="hidden"
          size="$5"
          borderRadius="$5"
          shadowColor="$shadowColor"
          opacity={1}
          enterStyle={{x: 0, y: -10, opacity: 0}}
          exitStyle={{x: 0, y: -10, opacity: 0}}
          animation={[
            'fast',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
        >
          <Tabs
            value={tabState}
            onValueChange={(value: string) => {
              setFileName({
                name: 'Upload File',
                color: undefined,
              })
              setTabState(value)
            }}
            orientation="horizontal"
            flexDirection="column"
            width={500}
          >
            <Tabs.List
              marginBottom="$-0.5"
              backgroundColor="$background"
              borderBottomColor="$color8"
              borderBottomWidth="$1"
              borderBottomLeftRadius={0}
              borderBottomRightRadius={0}
              borderRadius={0}
            >
              {!isEmbed && (
                <Tabs.Tab
                  unstyled
                  value="upload"
                  paddingHorizontal="$4"
                  paddingVertical="$2"
                  borderBottomLeftRadius={0}
                  borderBottomRightRadius={0}
                  borderBottomWidth={tabState == 'upload' ? '$1' : '$0'}
                  hoverStyle={{
                    backgroundColor: '$borderColorHover',
                    cursor: 'pointer',
                  }}
                >
                  <SizableText size="$2">Upload</SizableText>
                </Tabs.Tab>
              )}
              {submit !== undefined && (
                <Tabs.Tab
                  unstyled
                  value="embed"
                  paddingHorizontal="$4"
                  paddingVertical="$2"
                  borderBottomLeftRadius={0}
                  borderBottomRightRadius={0}
                  borderBottomWidth={tabState == 'embed' ? '$1' : '$0'}
                  hoverStyle={{
                    backgroundColor: '$borderColorHover',
                    cursor: 'pointer',
                  }}
                >
                  <SizableText size="$2">Embed Link</SizableText>
                </Tabs.Tab>
              )}
            </Tabs.List>

            {!isEmbed && (
              <Tabs.Content value="upload">
                <XStack
                  padding="$4"
                  alignItems="center"
                  backgroundColor="$background"
                >
                  <XStack
                    flex={1}
                    // @ts-ignore
                    onDrop={(e: React.DragEvent<HTMLDivElement>) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (drag) setDrag(false)
                      if (
                        e.dataTransfer.files &&
                        e.dataTransfer.files.length > 0
                      ) {
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
                              name: `File ${
                                file.name.length < 36
                                  ? file.name
                                  : file.name.slice(0, 32) + '...'
                              } is not ${
                                mediaType === 'image' ? 'an' : 'a'
                              } ${mediaType}.`,
                              color: 'red',
                            })
                            isMedia = false
                            return
                          }
                        })
                        if (isMedia) handleUpload(Array.from(files))
                        return
                      }
                    }}
                    onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onDragEnter={(e: React.DragEvent<HTMLDivElement>) => {
                      const relatedTarget = e.relatedTarget as HTMLElement
                      e.preventDefault()
                      e.stopPropagation()
                      if (
                        !relatedTarget ||
                        !e.currentTarget.contains(relatedTarget)
                      ) {
                        setDrag(true)
                      }
                    }}
                    onDragLeave={(e: React.DragEvent<HTMLDivElement>) => {
                      const relatedTarget = e.relatedTarget as HTMLElement
                      e.preventDefault()
                      e.stopPropagation()
                      if (
                        !relatedTarget ||
                        !e.currentTarget.contains(relatedTarget)
                      ) {
                        setDrag(false)
                      }
                    }}
                  >
                    <Label
                      htmlFor="file-upload"
                      borderColor="$color8"
                      borderWidth="$0.5"
                      borderRadius="$4"
                      width={500}
                      justifyContent="center"
                      backgroundColor={
                        drag ? '$borderColorHover' : '$background'
                      }
                      hoverStyle={{
                        backgroundColor: '$borderColorHover',
                        cursor: 'pointer',
                      }}
                    >
                      <SizableText
                        padding="$2"
                        overflow="hidden"
                        whiteSpace="nowrap"
                        textOverflow="ellipsis"
                        color={fileName.color}
                      >
                        {fileName.name}
                      </SizableText>
                    </Label>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept={
                        mediaType !== 'file' ? `${mediaType}/*` : undefined
                      }
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
                </XStack>
              </Tabs.Content>
            )}

            {submit !== undefined && (
              <Tabs.Content value="embed">
                <XStack
                  padding="$4"
                  alignItems="center"
                  backgroundColor="$background"
                >
                  <Form
                    alignItems="center"
                    onSubmit={() =>
                      submit(url, assign, setFileName, setLoading)
                    }
                    borderWidth={0}
                  >
                    <YStack flex={1}>
                      <XStack>
                        <Input
                          width={360}
                          marginRight="$3"
                          borderColor="$color8"
                          borderWidth="$0.5"
                          borderRadius="$3"
                          size="$3.5"
                          placeholder={`Input ${
                            mediaType === 'web-embed' ? 'X.com' : mediaType
                          } link...`}
                          focusStyle={{
                            borderColor: '$colorFocus',
                            outlineWidth: 0,
                          }}
                          hoverStyle={{
                            borderColor: '$colorFocus',
                            outlineWidth: 0,
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
                            flex={0}
                            flexShrink={0}
                            borderRadius="$3"
                            size="$3.5"
                            theme={fileName.color === 'red' ? 'gray' : 'green'}
                            disabled={fileName.color === 'red' ? true : false}
                            focusStyle={{
                              outlineWidth: 0,
                            }}
                          >
                            {loading ? (
                              <Spinner
                                size="small"
                                color="$green9"
                                paddingHorizontal="$3"
                              />
                            ) : (
                              'Embed'
                            )}
                          </Button>
                        </Form.Trigger>
                      </XStack>
                      {fileName.name != 'Upload File' && (
                        <SizableText
                          size="$2"
                          color={fileName.color}
                          paddingTop="$2"
                        >
                          {fileName.name}
                        </SizableText>
                      )}
                    </YStack>
                  </Form>
                </XStack>
              </Tabs.Content>
            )}
          </Tabs>
        </Popover.Content>
      </Popover>
    </YStack>
  )
}

import {useAppContext} from '@mintter/app/app-context'
import {toast} from '@mintter/app/toast'
import {usePopoverState} from '@mintter/app/use-popover-state'
import {client, trpc} from '@mintter/desktop/src/trpc'
import {
  BACKEND_FILE_UPLOAD_URL,
  getCIDFromIPFSUrl,
  usePublicationContentContext,
} from '@mintter/shared'
import {
  Button,
  Form,
  Input,
  Label,
  SizableText,
  Tabs,
  Text,
  XStack,
  YStack,
  useTheme,
} from '@mintter/ui'
import {ChangeEvent, useCallback, useEffect, useState} from 'react'
import {RiImage2Line} from 'react-icons/ri'
import {
  Block,
  BlockNoteEditor,
  createReactBlockSpec,
  defaultProps,
  getBlockInfoFromPos,
} from './blocknote'
import {InlineContent} from './blocknote/react'
import {MaxFileSizeB, MaxFileSizeMB} from './file'
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
    return false
  }
}

type ImageType = {
  id: string
  props: {
    url: string
    name: string
  }
  children: []
  content: []
  type: string
}

const boolRegex = new RegExp('true')

const Render = (
  block: Block<HMBlockSchema>,
  editor: BlockNoteEditor<HMBlockSchema>,
) => {
  const [selected, setSelected] = useState(false)
  const [isUploading, setUploading] = useState(false)
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
  }, [selection, tiptapEditor, block.id])

  useEffect(() => {
    if (!isUploading && hasSrc) {
      setUploading(true)

      client.webImporting.importWebFile
        .mutate(block.props.src)
        .then(({cid}) => {
          setUploading(false)
          editor.updateBlock(block, {
            props: {
              url: `ipfs://${cid}`,
              src: '',
            },
          })
        })
    }
  }, [hasSrc, block, isUploading, editor])

  const assignFile = (newImage: ImageType) => {
    editor.updateBlock(block.id, {
      props: {...block.props, ...newImage.props},
    })
    // editor.setTextCursorPosition(block.id, 'end')
  }

  const setSelection = (isSelected: boolean) => {
    setSelected(isSelected)
  }

  if (hasSrc || isUploading) {
    // this means we have a URL in the props.url that is not starting with `ipfs://`, which means we are uploading the image to IPFS
    return (
      <Button
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
        <ImageComponent
          block={block}
          editor={editor}
          assign={assignFile}
          selected={selected}
          setSelected={setSelection}
        />
      ) : editor.isEditable ? (
        <ImageForm block={block} assign={assignFile} editor={editor} />
      ) : (
        <></>
      )}
    </YStack>
  )
}

function ImageComponent({
  block,
  editor,
  assign,
  selected,
  setSelected,
}: {
  block: Block<HMBlockSchema>
  editor: BlockNoteEditor<HMBlockSchema>
  assign: any
  selected: boolean
  setSelected: any
}) {
  const [replace, setReplace] = useState(false)
  const [isDropping, setDropping] = useState(false)

  const {saveCidAsFile} = useAppContext()
  const saveImage = async () => {
    await saveCidAsFile(block.props.url, block.props.name)
  }
  const {ipfsBlobPrefix} = usePublicationContentContext()
  const imageUrl = block.props.url.includes('.') // what does this check for??
    ? null
    : `${ipfsBlobPrefix}${getCIDFromIPFSUrl(block.props.url)}`

  const handleDragReplace = useCallback(
    async (file: File) => {
      if (file.size > MaxFileSizeB) {
        toast.error(`The size of ${file.name} exceeds ${MaxFileSizeMB} MB.`)
        return
      }

      const formData = new FormData()
      formData.append('file', file)

      try {
        const response = await fetch(BACKEND_FILE_UPLOAD_URL, {
          method: 'POST',
          body: formData,
        })
        const data = await response.text()
        assign({
          props: {url: data ? `ipfs://${data}` : '', name: file.name},
        } as ImageType)
      } catch (error) {
        console.error(error)
        toast.error(`Failed to add ${file.name}: ${error.message}`)
      }
      // editor.setTextCursorPosition(editor.topLevelBlocks.slice(-1)[0], 'end')
    },
    [assign],
  )

  return (
    <YStack gap="$2">
      {isDropping ? (
        <XStack
          position="absolute"
          zIndex={100}
          fullscreen
          pointerEvents="none"
          alignItems="center"
          justifyContent="center"
        >
          <XStack
            paddingHorizontal="$4"
            paddingVertical="$2"
            backgroundColor="$backgroundColor"
            borderWidth={2}
            borderRadius="$2"
            borderColor={'$color8'}
          >
            <Text fontFamily="$mono" fontSize="$3" zIndex={2}>
              Drop to replace
            </Text>
          </XStack>
          <XStack
            opacity={0.75}
            backgroundColor="$backgroundHover"
            position="absolute"
            fullscreen
            zIndex={1}
          />
        </XStack>
      ) : null}
      <YStack
        backgroundColor={selected ? '$color4' : '$color3'}
        borderColor={selected ? '$color8' : 'transparent'}
        borderWidth={2}
        borderRadius="$2"
        overflow="hidden"
        hoverStyle={{
          backgroundColor: '$color4',
        }}
        padding="$2"
        // @ts-ignore
        contentEditable={false}
        className={block.type}
        onHoverIn={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
          setReplace(true)
        }}
        onHoverOut={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
          setReplace(false)
        }}
        onDrop={(e: React.DragEvent<HTMLDivElement>) => {
          if (e.dataTransfer.effectAllowed === 'move') return
          e.preventDefault()
          e.stopPropagation()
          setDropping(false)
          if (selected) setSelected(false)
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = Array.from(e.dataTransfer.files)[0]
            if (!file.type.includes('image/')) {
              toast.error(`The dragged file is not an image.`)
              return
            }
            handleDragReplace(file)
            return
          }
        }}
        onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
          e.preventDefault()
          e.stopPropagation()
          setDropping(true)
        }}
        onDragEnter={(e: React.DragEvent<HTMLDivElement>) => {
          const relatedTarget = e.relatedTarget as HTMLElement
          e.preventDefault()
          e.stopPropagation()
          setDropping(true)
          if (
            (!relatedTarget || !e.currentTarget.contains(relatedTarget)) &&
            e.dataTransfer.effectAllowed !== 'move'
          ) {
            setSelected(true)
          }
        }}
        onDragLeave={(e: React.DragEvent<HTMLDivElement>) => {
          const relatedTarget = e.relatedTarget as HTMLElement
          e.preventDefault()
          e.stopPropagation()
          setDropping(false)
          if (
            (!relatedTarget || !e.currentTarget.contains(relatedTarget)) &&
            e.dataTransfer.effectAllowed !== 'move'
          ) {
            setSelected(false)
          }
        }}
        outlineWidth={0}
      >
        {replace ? (
          editor.isEditable ? (
            <Button
              position="absolute"
              top="$1.5"
              right="$1.5"
              zIndex="$4"
              size="$1"
              width={60}
              onPress={() =>
                assign({
                  props: {
                    url: '',
                    name: '',
                  },
                  children: [],
                  content: [],
                  type: 'image',
                } as ImageType)
              }
              hoverStyle={{
                backgroundColor: '$backgroundTransparent',
              }}
            >
              replace
            </Button>
          ) : (
            <Button
              position="absolute"
              top="$1.5"
              right="$2"
              zIndex="$4"
              size="$1"
              width={50}
              onPress={saveImage}
              hoverStyle={{
                backgroundColor: '$backgroundTransparent',
              }}
            >
              save
            </Button>
          )
        ) : null}
        {imageUrl && (
          <img
            src={imageUrl}
            alt={block.props.name || 'image'}
            contentEditable={false}
          />
        )}
      </YStack>
      <InlineContent
        className="image-caption"
        // onClick={() => setSelected(false)}
      />
    </YStack>
  )
}

function ImageForm({
  block,
  assign,
  editor,
}: {
  block: Block<HMBlockSchema>
  assign: any
  editor: BlockNoteEditor<HMBlockSchema>
}) {
  const [url, setUrl] = useState('')
  const upload = trpc.webImporting.importWebFile.useMutation()
  const [tabState, setTabState] = useState('upload')
  const [fileName, setFileName] = useState<{
    name: string
    color: string | undefined
  }>({
    name: 'Upload File',
    color: undefined,
  })
  const [drag, setDrag] = useState(false)
  const theme = useTheme()
  const popoverState = usePopoverState()

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
            : `The image size exceeds ${MaxFileSizeMB} MB.`,
        color: 'red',
      })
      return
    }

    const {name} = files[0]
    const formData = new FormData()
    formData.append('file', files[0])

    try {
      const response = await fetch(BACKEND_FILE_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      })
      const data = await response.text()
      assign({
        props: {url: data ? `ipfs://${data}` : '', name: name},
      } as ImageType)
    } catch (error) {
      console.error(error)
    }
    for (let i = files.length - 1; i > 0; i--) {
      const {name} = files[i]
      const formData = new FormData()
      formData.append('file', files[i])

      try {
        const response = await fetch(BACKEND_FILE_UPLOAD_URL, {
          method: 'POST',
          body: formData,
        })
        const data = await response.text()
        editor.insertBlocks(
          [
            {
              type: 'image',
              props: {
                url: data,
                name: name,
              },
            },
          ],
          block.id,
          'after',
        )
      } catch (error) {
        console.error(error)
      }
    }
    // editor.setTextCursorPosition(editor.topLevelBlocks.slice(-1)[0], 'end')
  }

  const submitImage = async (url: string) => {
    if (isValidUrl(url)) {
      const imageData = await upload.mutateAsync(url)
      if (imageData?.cid) {
        assign({props: {url: `ipfs://${imageData}`}} as ImageType)
      } else {
        let imgTypeSplit = imageData.type.split('/')
        setFileName({
          name: `uploadedImage.${imgTypeSplit[imgTypeSplit.length - 1]}`,
          color: 'red',
        })
      }
    } else setFileName({name: 'The provided URL is invalid.', color: 'red'})
  }

  useEffect(() => {
    function closeOnEscape(e: KeyboardEvent) {
      if (popoverState.open && e.key == 'Escape') {
        e.preventDefault()
        popoverState.onOpenChange(false)
      }
    }

    window.addEventListener('keyup', closeOnEscape)

    return () => {
      window.removeEventListener('keyup', closeOnEscape)
    }
  }, [popoverState])

  return (
    <YStack
      //@ts-ignore
      contentEditable={false}
      position="relative"
      borderWidth={0}
      outlineWidth={0}
    >
      {popoverState.open ? (
        <XStack
          backgroundColor="transparent"
          fullscreen
          zIndex={9998}
          style={{position: 'fixed'}}
          onPress={() => popoverState.onOpenChange(false)}
        />
      ) : null}
      <Button
        icon={<RiImage2Line fill={theme.color12.get()} />}
        borderRadius={0}
        size="$5"
        justifyContent="flex-start"
        backgroundColor="$color3"
        hoverStyle={{
          backgroundColor: '$color4',
        }}
        onPress={() => popoverState.onOpenChange(!popoverState.open)}
      >
        Add an Image
      </Button>

      {popoverState.open ? (
        <>
          <YStack
            position="absolute"
            zIndex={9999}
            padding={0}
            elevation="$3"
            overflow="hidden"
            borderRadius="$5"
            // shadowColor="$shadowColor"
            opacity={1}
            left="50%"
            top={24}
            x="-50%"
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
              </Tabs.List>

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
                        let isImage = true
                        const files = Array.from(e.dataTransfer.files)
                        files.forEach((file) => {
                          if (!file.type.includes('image/')) {
                            setFileName({
                              name: `File ${
                                file.name.length < 36
                                  ? file.name
                                  : file.name.slice(0, 32) + '...'
                              } is not an image.`,
                              color: 'red',
                            })
                            isImage = false
                            return
                          }
                        })
                        if (isImage) handleUpload(Array.from(files))
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
                      accept="image/*"
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
              <Tabs.Content value="embed">
                <XStack
                  padding="$4"
                  alignItems="center"
                  backgroundColor="$background"
                >
                  <Form
                    alignItems="center"
                    onSubmit={() => submitImage(url)}
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
                          placeholder="Input image link..."
                          focusStyle={{
                            borderColor: '$colorFocus',
                            outlineWidth: 0,
                          }}
                          hoverStyle={{
                            borderColor: '$colorFocus',
                            outlineWidth: 0,
                          }}
                          onChange={(e) => setUrl(e.nativeEvent.text)}
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
                            Embed
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
            </Tabs>
          </YStack>
        </>
      ) : null}
    </YStack>
  )
}

function urltoFile(url: string, filename: string, mimeType) {
  var arr = url.split(','),
    mime = arr[0]!.match(/:(.*?);/)![1],
    bstr = atob(arr[arr.length - 1]),
    n = bstr.length,
    u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  var file = new File([u8arr], filename, {type: mime || mimeType})
  return Promise.resolve(file)
}

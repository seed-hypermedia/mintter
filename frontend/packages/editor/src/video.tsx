import {HMBlockSchema} from '@mintter/app/src/client/schema'
import {BACKEND_FILE_UPLOAD_URL, BACKEND_FILE_URL} from '@mintter/shared'
import {
  Button,
  Form,
  Input,
  Label,
  Popover,
  SizableText,
  Tabs,
  XStack,
  YStack,
  useTheme,
} from '@mintter/ui'
import {ChangeEvent, useEffect, useState} from 'react'
import {RiVideoAddFill, RiVideoAddLine} from 'react-icons/ri'
import {
  Block,
  BlockNoteEditor,
  DefaultBlockSchema,
  ReactSlashMenuItem,
  createReactBlockSpec,
  defaultProps,
  getBlockInfoFromPos,
  insertOrUpdateBlock,
} from './blocknote'

export const VideoBlock = createReactBlockSpec({
  type: 'video',
  propSchema: {
    ...defaultProps,
    url: {
      default: '',
    },
    name: {
      default: '',
    },
    defaultOpen: {
      values: ['false', 'true'],
      default: 'true',
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

type VideoType = {
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
  const tiptapEditor = editor._tiptapEditor
  const selection = tiptapEditor.state.selection

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
  }, [selection])

  const assignFile = (newVideo: VideoType) => {
    editor.updateBlock(block.id, {
      props: {...block.props, ...newVideo.props},
    })
    editor.setTextCursorPosition(block.id, 'end')
  }

  const setSelection = (isSelected: boolean) => {
    setSelected(isSelected)
  }

  return (
    <YStack overflow="hidden">
      {block.props.url ? (
        <VideoComponent
          block={block}
          editor={editor}
          assign={assignFile}
          selected={selected}
          setSelected={setSelection}
        />
      ) : editor.isEditable ? (
        <VideoForm block={block} editor={editor} assign={assignFile} />
      ) : (
        <></>
      )}
    </YStack>
  )
}

function VideoComponent({
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

  const getSourceType = (name: string) => {
    const nameArray = name.split('.')
    return `video/${nameArray[nameArray.length - 1]}`
  }

  const handleDragReplace = async (file: File) => {
    if (file.size > 62914560) {
      console.error(`The size of ${file.name} exceeds 60 MB.`)
      return
    }
    assign({
      props: {
        name: '',
        url: '',
      },
      children: [],
      content: [],
      type: 'video',
    } as VideoType)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(BACKEND_FILE_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      })
      const data = await response.text()
      assign({props: {url: data, name: file.name}} as VideoType)
    } catch (error) {
      console.error(error)
    }
    editor.setTextCursorPosition(editor.topLevelBlocks.slice(-1)[0], 'end')
  }

  return (
    <YStack
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
        if (selected) setSelected(false)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const file = Array.from(e.dataTransfer.files)[0]
          if (!file.type.includes('video/')) {
            console.error(`The dragged file is not a video.`)
            return
          }
          handleDragReplace(file)
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
        if (
          (!relatedTarget || !e.currentTarget.contains(relatedTarget)) &&
          e.dataTransfer.effectAllowed !== 'move'
        ) {
          setSelected(false)
        }
      }}
      borderWidth={0}
      outlineWidth={0}
    >
      {replace && editor.isEditable ? (
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
                name: '',
                url: '',
              },
              children: [],
              content: [],
              type: 'video',
            } as VideoType)
          }
          hoverStyle={{
            backgroundColor: '$backgroundTransparent',
          }}
        >
          replace
        </Button>
      ) : null}
      {['.', '/', ':', 'http', 'https'].some((value) =>
        block.props.url.includes(value),
      ) ? (
        <VideoWrapper selected={selected}>
          <XStack
            tag="iframe"
            position="absolute"
            className="video-iframe"
            top="$2"
            left="$2"
            bottom="$2"
            right="$2"
            // @ts-expect-error
            src={block.props.url}
            frameBorder="0"
            allowFullScreen
          />
        </VideoWrapper>
      ) : (
        <VideoWrapper selected={selected}>
          <video
            contentEditable={false}
            playsInline
            controls
            preload="metadata"
          >
            <source
              src={`${BACKEND_FILE_URL}/${block.props.url}`}
              type={getSourceType(block.props.name)}
            />
            Something is wrong with the video file.
          </video>
        </VideoWrapper>
      )}
    </YStack>
  )
}

function VideoWrapper({children, selected = false}) {
  return (
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
      paddingBottom="56.25%"
      position="relative"
      height={0}
    >
      {children}
    </YStack>
  )
}

function VideoForm({
  block,
  assign,
  editor,
}: {
  block: Block<HMBlockSchema>
  assign: any
  editor: BlockNoteEditor<HMBlockSchema>
}) {
  const [url, setUrl] = useState('')
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

  const handleUpload = async (files: File[]) => {
    const largeFileIndex = files.findIndex((file) => file.size > 62914560)
    if (largeFileIndex > -1) {
      const largeFile = files[largeFileIndex]
      setFileName({
        name:
          largeFileIndex > 0
            ? `The size of ${
                largeFile.name.length < 36
                  ? largeFile.name
                  : largeFile.name.slice(0, 32) + '...'
              } exceeds 60 MB.`
            : 'The video size exceeds 60 MB.',
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
      assign({props: {url: data, name: name}} as VideoType)
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
              type: 'video',
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
    editor.setTextCursorPosition(editor.topLevelBlocks.slice(-1)[0], 'end')
  }

  const submitVideo = async (url: string) => {
    if (isValidUrl(url)) {
      let embedUrl = ''
      ;('https://www.youtube.com/embed')
      if (url.includes('youtu.be')) {
        const urlArray = url.split('/')
        embedUrl =
          'https://www.youtube.com/embed/' + urlArray[urlArray.length - 1]
      } else if (url.includes('youtube')) {
        embedUrl = 'https://www.youtube.com/embed/' + url.split('=')[1]
      } else if (url.includes('vimeo')) {
        const urlArray = url.split('/')
        embedUrl =
          'https://player.vimeo.com/video/' + urlArray[urlArray.length - 1]
      } else {
        setFileName({name: 'Unsupported video source.', color: 'red'})
        return
      }
      assign({props: {url: embedUrl}})
    } else setFileName({name: 'The provided URL is invalid.', color: 'red'})
  }

  const isValidUrl = (urlString: string) => {
    try {
      return Boolean(new URL(urlString))
    } catch (e) {
      console.log(e)
      return false
    }
  }

  return (
    <div>
      <YStack
        //@ts-ignore
        contentEditable={false}
        position="relative"
        borderWidth={0}
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
              icon={<RiVideoAddLine fill={theme.color12.get()} />}
              borderRadius={0}
              size="$5"
              justifyContent="flex-start"
            >
              Add a Video
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
              'quick',
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
                        let isVideo = true
                        const files = Array.from(e.dataTransfer.files)
                        files.forEach((file) => {
                          if (!file.type.includes('video/')) {
                            setFileName({
                              name: `File ${
                                file.name.length < 36
                                  ? file.name
                                  : file.name.slice(0, 32) + '...'
                              } is not a video.`,
                              color: 'red',
                            })
                            isVideo = false
                            return
                          }
                        })
                        if (isVideo) handleUpload(Array.from(files))
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
                      size="$3"
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
                      accept="video/*"
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
                    onSubmit={() => submitVideo(url)}
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
                          placeholder="Input video link..."
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
          </Popover.Content>
        </Popover>
      </YStack>
    </div>
  )
}

export const insertVideo = new ReactSlashMenuItem<
  DefaultBlockSchema & {video: typeof VideoBlock}
>(
  'Video',
  // @ts-ignore
  (editor: BlockNoteEditor<HMBlockSchema>) => {
    insertOrUpdateBlock(editor, {
      type: 'video',
      props: {
        url: '',
      },
    })
  },
  ['video', 'vid', 'media'],
  'Media',
  <RiVideoAddFill size={18} />,
  'Insert a video',
)

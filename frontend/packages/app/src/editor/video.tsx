import { Block, BlockNoteEditor, DefaultBlockSchema, defaultProps } from "@mintter/app/src/blocknote-core";
import { getBlockInfoFromPos } from "@mintter/app/src/blocknote-core/extensions/Blocks/helpers/getBlockInfoFromPos";
import { insertOrUpdateBlock } from "@mintter/app/src/blocknote-core/extensions/SlashMenu/defaultSlashMenuItems";
import { createReactBlockSpec, InlineContent, ReactSlashMenuItem } from "@mintter/app/src/blocknote-react";
import { HDBlockSchema } from "@mintter/app/src/client/schema";
import { Button, Form, Input, Label, Popover, SizableText, Tabs, XStack, YStack } from "@mintter/ui";
import { ChangeEvent, useEffect, useState } from "react";
import { RiVideoAddFill } from "react-icons/ri";
import { BACKEND_FILE_UPLOAD_URL, BACKEND_FILE_URL } from "../constants";
import { toast } from "../toast";

export const VideoBlock = createReactBlockSpec({
  type: "video",
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
    block: Block<HDBlockSchema>
    editor: BlockNoteEditor<HDBlockSchema>
  }) => Render(block, editor),
});

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
  block: Block<HDBlockSchema>,
  editor: BlockNoteEditor<HDBlockSchema>,
) => {

  const assignFile = (newVideo: VideoType) => {
    editor.updateBlock(block.id, {props: {...block.props, ...newVideo.props}})
    editor.setTextCursorPosition(block.id, 'end')
  }

  return (
    <YStack borderWidth={0} outlineWidth={0}>
      {block.props.url ? (
        <VideoComponent block={block} editor={editor} assign={assignFile} />
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
}: {
  block: Block<HDBlockSchema>
  editor: BlockNoteEditor<HDBlockSchema>
  assign: any
}) {
  const [replace, setReplace] = useState(false)
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

  const getSourceType = (name: string) => {
    const nameArray = name.split('.');
    return `video/${nameArray[nameArray.length - 1]}`
  }

  const handleDragReplace = async (file: File) => {
    if (file.size > 62914560) {
      toast.error(`The size of ${file.name} exceeds 60 MB.`)
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
    <div className={selected ? 'ProseMirror-selectednode' : ''}>
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
          e.preventDefault();
          e.stopPropagation();
          if (selected) setSelected(false)
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files)
            handleDragReplace(Array.from(files)[0])
            return
          }
        }}
        onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragEnter={(e: React.DragEvent<HTMLDivElement>) => {
          const relatedTarget = e.relatedTarget as HTMLElement;
          e.preventDefault();
          e.stopPropagation();
          if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
            setSelected(true);
          }
        }}
        onDragLeave={(e: React.DragEvent<HTMLDivElement>) => {
          const relatedTarget = e.relatedTarget as HTMLElement;
          e.preventDefault();
          e.stopPropagation();
          if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
            setSelected(false);
          }
        }}
        borderWidth={0}
        outlineWidth={0}
        outlineColor="transparent"
        borderColor="transparent"
      >
        {replace && editor.isEditable ? (
          <Button
            theme="gray"
            position="absolute"
            top="$1.5"
            right="$1.5"
            zIndex="$4"
            size="$1"
            width={60}
            color="muted"
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
          >
            replace
          </Button>
        ) : null}
        <video
          contentEditable={false}
          playsInline
          controls
          preload="metadata"
        >
          <source src={`${BACKEND_FILE_URL}/${block.props.url}`} type={getSourceType(block.props.name)} />
          Something is wrong with the video file.
        </video>
      </YStack>
    </div>
  )
}

function VideoForm({
  block,
  assign,
  editor,
}: {
  block: Block<HDBlockSchema>
  assign: any
  editor: BlockNoteEditor<HDBlockSchema>
}) {
  const [url, setUrl] = useState('')
  const [tabState, setTabState] = useState('upload')
  const [fileName, setFileName] = useState<{name: string; color: string}>({
    name: 'Upload File',
    color: 'black',
  })
  const [drag, setDrag] = useState(false)

  const handleUpload = async (files: File[]) => {
    const largeFileIndex = files.findIndex((file) => file.size > 62914560)
    if (largeFileIndex > -1) {
      const largeFile = files[largeFileIndex]
      setFileName({
        name:
          largeFileIndex > 0
            ? `The size of ${largeFile.name.length < 36 ? largeFile.name : largeFile.name.slice(0, 32) + '...'} exceeds 60 MB.`
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
      const blob = await fetch(url).then((res) => res.blob())
      const webFile = new File(
        [blob],
        `mintterVideo.${blob.type.split('/').pop()}`,
      )
      if (webFile && webFile.size <= 62914560) {
        const formData = new FormData()
        formData.append('file', webFile)

        try {
          const response = await fetch(BACKEND_FILE_UPLOAD_URL,
            {
              method: 'POST',
              body: formData,
            },
          )
          const data = await response.text()
          assign({props: {url: data, name: webFile.name}} as VideoType)
        } catch (error) {
          console.error(error)
        }
      } else setFileName({name: 'The file size exceeds 60 MB', color: 'red'})
    }
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
        borderColor="transparent"
        outlineColor="transparent"
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
              // icon={FileIcon}
              theme="gray"
              borderRadius={0}
              size="$5"
              justifyContent="flex-start"
            >
              Add a Video
            </Button>
          </Popover.Trigger>
          <Popover.Content
            padding={0}
            elevation="$4"
            size="$5"
            x={0}
            y={0}
            opacity={1}
            enterStyle={{x: 0, y: -1, opacity: 0}}
            exitStyle={{x: 0, y: -1, opacity: 0}}
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
              onValueChange={setTabState}
              orientation="horizontal"
              flexDirection="column"
              borderWidth="$1"
              borderColor="white"
              borderRadius="$5"
              width={500}
            >
              <Tabs.List
                marginBottom="$-0.5"
                backgroundColor="white"
                borderBottomColor="lightgrey"
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
                  borderRadius={0}
                  borderBottomColor={tabState == 'upload' ? 'black' : ''}
                  borderBottomWidth={tabState == 'upload' ? '$1' : '$0'}
                  hoverStyle={{
                    backgroundColor: 'lightgrey',
                    cursor: 'pointer',
                  }}
                >
                  <SizableText size="$2" color="black">
                    Upload
                  </SizableText>
                </Tabs.Tab>
                <Tabs.Tab
                  unstyled
                  value="embed"
                  paddingHorizontal="$4"
                  paddingVertical="$2"
                  borderBottomLeftRadius={0}
                  borderBottomRightRadius={0}
                  borderRadius={0}
                  borderBottomColor={tabState == 'embed' ? 'black' : ''}
                  borderBottomWidth={tabState == 'embed' ? '$1' : '$0'}
                  hoverStyle={{
                    backgroundColor: 'lightgrey',
                    cursor: 'pointer',
                  }}
                >
                  <SizableText size="$2" color="black">
                    Embed Link
                  </SizableText>
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Content value="upload">
                <XStack
                  padding="$4"
                  alignItems="center"
                  backgroundColor="white"
                >
                  <XStack
                    flex={1}
                    backgroundColor="white"
                    // @ts-ignore
                    onDrop={(e: React.DragEvent<HTMLDivElement>) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (drag) setDrag(false)
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        let isVideo = true;
                        const files = Array.from(e.dataTransfer.files)
                        files.forEach((file) => {
                          if (!file.type.includes('video/')) {
                            setFileName({ name: `File ${file.name.length < 36 ? file.name : file.name.slice(0, 32) + '...'} is not a video.`, color: 'red' })
                            isVideo = false;
                            return
                          }
                        })
                        if (isVideo) handleUpload(Array.from(files))
                        return
                      }
                    }}
                    onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDragEnter={(e: React.DragEvent<HTMLDivElement>) => {
                      const relatedTarget = e.relatedTarget as HTMLElement;
                      e.preventDefault();
                      e.stopPropagation();
                      if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
                        setDrag(true);
                      }
                    }}
                    onDragLeave={(e: React.DragEvent<HTMLDivElement>) => {
                      const relatedTarget = e.relatedTarget as HTMLElement;
                      e.preventDefault();
                      e.stopPropagation();
                      if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
                        setDrag(false);
                      }
                    }}
                  >
                    <Label
                      htmlFor="file-upload"
                      borderColor="lightgrey"
                      borderWidth="$0.5"
                      size="$3"
                      width={500}
                      justifyContent="center"
                      hoverStyle={{
                        backgroundColor: 'lightgrey',
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
                  backgroundColor="white"
                >
                  <Form
                    alignItems="center"
                    onSubmit={() => submitVideo(url)}
                    borderWidth={0}
                  >
                    <XStack>
                      <Input
                        width={380}
                        size="$3"
                        marginRight="$3"
                        borderColor="lightgrey"
                        borderWidth="$0.5"
                        borderRadius="$0"
                        color="black"
                        placeholder="Add a Video URL"
                        focusStyle={{
                          borderColor: 'lightgrey',
                          outlineWidth: 0,
                          cursor: 'pointer',
                        }}
                        onChange={(e) => setUrl(e.nativeEvent.text)}
                      />
                      <Form.Trigger asChild>
                        <Button
                          size="$3"
                          flex={0}
                          flexShrink={0}
                          theme={fileName.color === 'red' ? 'gray' : 'green'}
                          disabled={fileName.color === 'red' ? true : false}
                          focusStyle={{
                            outlineWidth: 0,
                          }}
                        >
                          Save
                        </Button>
                      </Form.Trigger>
                    </XStack>
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
DefaultBlockSchema & { video: typeof VideoBlock }
>(
"Video",
// @ts-ignore
(editor: BlockNoteEditor<HDBlockSchema>) => {
  insertOrUpdateBlock(editor, {
    type: 'video',
    props: {
      url: '',
    },
  })
},
["video", "vid", "media"],
"Media",
<RiVideoAddFill size={18} />,
"Insert a video"
);
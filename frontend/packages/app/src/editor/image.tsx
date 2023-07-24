import {
  Block,
  BlockNoteEditor,
  DefaultBlockSchema,
  defaultProps,
} from '@mintter/app/src/blocknote-core'
import {getBlockInfoFromPos} from '@mintter/app/src/blocknote-core/extensions/Blocks/helpers/getBlockInfoFromPos'
import {insertOrUpdateBlock} from '@mintter/app/src/blocknote-core/extensions/SlashMenu/defaultSlashMenuItems'
import {
  createReactBlockSpec,
  InlineContent,
  ReactSlashMenuItem,
} from '@mintter/app/src/blocknote-react'
import {HDBlockSchema} from '@mintter/app/src/client/schema'
import {toast} from 'react-hot-toast'
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
} from '@mintter/ui'
import {save} from '@tauri-apps/api/dialog'
import {BaseDirectory, writeBinaryFile} from '@tauri-apps/api/fs'
import {getClient, ResponseType} from '@tauri-apps/api/http'
import {appDataDir} from '@tauri-apps/api/path'
import {ChangeEvent, useEffect, useState} from 'react'
import {RiImage2Fill} from 'react-icons/ri'

export const ImageBlock = createReactBlockSpec({
  type: 'image',
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
})

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
  block: Block<HDBlockSchema>,
  editor: BlockNoteEditor<HDBlockSchema>,
) => {
  const [image, setImage] = useState<ImageType>({
    id: block.id,
    props: {
      url: block.props.url,
      name: block.props.name,
    },
    children: [],
    content: block.content,
    type: block.type,
  } as ImageType)

  const assignFile = (newImage: ImageType) => {
    setImage({...image, props: {...image.props, ...newImage.props}})
    editor.updateBlock(image.id, {props: {...block.props, ...newImage.props}})
    editor.setTextCursorPosition(image.id, 'end')
  }

  return (
    <YStack borderWidth={0} outlineWidth={0}>
      {image.props.url ? (
        <ImageComponent block={block} editor={editor} assign={assignFile} />
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

  const saveImage = async () => {
    const client = await getClient()
    const data = (
      await client.get(`http://localhost:55001/ipfs/${block.props.url}`, {
        responseType: ResponseType.Binary,
      })
    ).data as any

    const filePath = await save({
      defaultPath: (await appDataDir()) + '/' + block.props.name,
    })

    if (filePath) {
      try {
        await writeBinaryFile(filePath ? filePath : 'mintter-image', data, {
          dir: BaseDirectory.AppData,
        })
        toast.success(`Successfully downloaded image ${block.props.name}`)
      } catch (e) {
        toast.error(`Failed to download image ${block.props.name}`)
        console.log(e)
      }
    }
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
        borderWidth={0}
        outlineWidth={0}
        outlineColor="transparent"
        borderColor="transparent"
      >
        {replace ? (
          editor.isEditable ? (
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
                    url: '',
                    name: '',
                  },
                  children: [],
                  content: [],
                  type: 'image',
                } as ImageType)
              }
            >
              replace
            </Button>
          ) : (
            <Button
              theme="white"
              position="absolute"
              top="$1.5"
              right="$2"
              zIndex="$4"
              size="$1"
              width={50}
              color="muted"
              backgroundColor="lightgrey"
              onPress={saveImage}
            >
              save
            </Button>
          )
        ) : null}
        <img
          src={`http://localhost:55001/ipfs/${block.props.url}`}
          contentEditable={false}
        />
      </YStack>
      <InlineContent
        className="image-caption"
        onClick={() => setSelected(false)}
      />
    </div>
  )
}

function ImageForm({
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

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files)
      const largeFileIndex = files.findIndex((file) => file.size > 62914560)
      if (largeFileIndex > -1) {
        setFileName({
          name:
            largeFileIndex > 0
              ? `The size of ${files[largeFileIndex].name} exceeds 60 MB.`
              : 'The image size exceeds 60 MB.',
          color: 'red',
        })
        return
      }

      const {name} = files[0]
      const formData = new FormData()
      formData.append('file', files[0])

      try {
        const response = await fetch(
          'http://localhost:55001/ipfs/file-upload',
          {
            method: 'POST',
            body: formData,
          },
        )
        const data = await response.text()
        assign({props: {url: data, name: name}} as ImageType)
      } catch (error) {
        console.error(error)
      }
      for (let i = files.length - 1; i > 0; i--) {
        const {name} = files[i]
        const formData = new FormData()
        formData.append('file', files[i])

        try {
          const response = await fetch(
            'http://localhost:55001/ipfs/file-upload',
            {
              method: 'POST',
              body: formData,
            },
          )
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
      editor.setTextCursorPosition(editor.topLevelBlocks.slice(-1)[0], 'end')
    }
  }

  const submitImage = async (url: string) => {
    if (isValidUrl(url)) {
      const blob = await fetch(url).then((res) => res.blob())
      const webFile = new File(
        [blob],
        `mintterImage.${blob.type.split('/').pop()}`,
      )
      if (webFile && webFile.size <= 62914560) {
        const formData = new FormData()
        formData.append('file', webFile)

        try {
          const response = await fetch(
            'http://localhost:55001/ipfs/file-upload',
            {
              method: 'POST',
              body: formData,
            },
          )
          const data = await response.text()
          assign({props: {url: data}} as ImageType)
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
              icon={RiImage2Fill}
              theme="gray"
              borderRadius={0}
              size="$5"
              justifyContent="flex-start"
            >
              Add an Image
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
                  <XStack flex={1} backgroundColor="white">
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
                      multiple
                      accept="image/*"
                      style={{
                        background: 'white',
                        padding: '0 2px',
                        display: 'none',
                      }}
                      onChange={handleUpload}
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
                    onSubmit={() => submitImage(url)}
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
                        placeholder="Add an Image URL"
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

export const insertImage = new ReactSlashMenuItem<
  DefaultBlockSchema & {image: typeof ImageBlock}
>(
  'Image',
  // @ts-ignore
  (editor: BlockNoteEditor<HDBlockSchema>) => {
    insertOrUpdateBlock(editor, {
      type: 'image',
      props: {
        url: '',
      },
    })
  },
  ['image', 'img', 'picture'],
  'Media',
  <RiImage2Fill size={18} />,
  'Insert an image',
)

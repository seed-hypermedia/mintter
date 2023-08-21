import {
  Block,
  BlockNoteEditor,
  defaultProps,
} from '@mintter/app/src/blocknote-core'
import {getBlockInfoFromPos} from '@mintter/app/src/blocknote-core/extensions/Blocks/helpers/getBlockInfoFromPos'
import {insertOrUpdateBlock} from '@mintter/app/src/blocknote-core/extensions/SlashMenu/defaultSlashMenuItems'
import {createReactBlockSpec} from '@mintter/app/src/blocknote-react/ReactBlockSpec'
import {ReactSlashMenuItem} from '@mintter/app/src/blocknote-react/SlashMenu/ReactSlashMenuItem'
import {HDBlockSchema} from '@mintter/app/src/client/schema'
import {useAppContext} from '@mintter/app/src/app-context'
import {
  Button,
  Label,
  Popover,
  SizableText,
  Tabs,
  XStack,
  YStack,
} from '@mintter/ui'
import {ChangeEvent, useEffect, useState} from 'react'
import {RiFile2Line} from 'react-icons/ri'
import {BACKEND_FILE_UPLOAD_URL} from '../constants'
import {toast} from '../toast'

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
    defaultOpen: {
      values: ['false', 'true'],
      default: 'true',
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
    block: Block<HDBlockSchema>
    editor: BlockNoteEditor<HDBlockSchema>
  }) => Render(block, editor),
})

type FileType = {
  id: string
  props: {
    url: string
    name: string
    size: string
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
  const assignFile = (newFile: FileType) => {
    editor.updateBlock(block.id, {
      props: {...block.props, ...newFile.props},
    })
    editor.setTextCursorPosition(block.id, 'end')
  }

  return (
    <YStack borderWidth={0} outlineWidth={0}>
      {block.props.url ? (
        <FileComponent block={block} editor={editor} assign={assignFile} />
      ) : editor.isEditable ? (
        <FileForm block={block} assign={assignFile} editor={editor} />
      ) : (
        <></>
      )}
    </YStack>
  )
}

function FileComponent({
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

  const {saveCidAsFile} = useAppContext()
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

  const saveFile = async () => {
    await saveCidAsFile(block.props.url, block.props.name)
  }

  function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
  }

  const handleDragReplace = async (file: File) => {
    if (file.size > 62914560) {
      toast.error(`The size of ${file.name} exceeds 60 MB.`)
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
        props: {url: data, name: file.name, size: file.size.toString()},
      } as FileType)
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
          e.preventDefault()
          e.stopPropagation()
          if (selected) setSelected(false)
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files)
            handleDragReplace(Array.from(files)[0])
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
          if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
            setSelected(true)
          }
        }}
        onDragLeave={(e: React.DragEvent<HTMLDivElement>) => {
          const relatedTarget = e.relatedTarget as HTMLElement
          e.preventDefault()
          e.stopPropagation()
          if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
            setSelected(false)
          }
        }}
        borderWidth={0}
        outlineWidth={0}
        outlineColor="transparent"
        borderColor="transparent"
      >
        {replace ? (
          editor.isEditable ? (
            <Button
              theme="white"
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
                    size: '0',
                  },
                  children: [],
                  content: [],
                  type: 'file',
                } as FileType)
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
              onPress={saveFile}
            >
              save
            </Button>
          )
        ) : null}
        <Button
          theme="gray"
          borderRadius={1}
          size="$5"
          fontSize="$4"
          flex={1}
          justifyContent="flex-start"
          icon={RiFile2Line}
          disabled
        >
          <SizableText
            size="$5"
            maxWidth="17em"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            userSelect="text"
          >
            {block.props.name}
          </SizableText>
          <SizableText color="gray" size="$2" minWidth="4.5em">
            {formatBytes(parseInt(block.props.size))}
          </SizableText>
        </Button>
      </YStack>
    </div>
  )
}

function FileForm({
  block,
  assign,
  editor,
}: {
  block: Block<HDBlockSchema>
  assign: any
  editor: BlockNoteEditor<HDBlockSchema>
}) {
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
            ? `The size of ${
                largeFile.name.length < 36
                  ? largeFile.name
                  : largeFile.name.slice(0, 32) + '...'
              } exceeds 60 MB.`
            : 'The file size exceeds 60 MB.',
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
        props: {url: data, name: name, size: files[0].size.toString()},
      } as FileType)
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
        assign({
          props: {url: data, name: name, size: files[0].size.toString()},
        } as FileType)
      } catch (error) {
        console.error(error)
      }
    }
    editor.setTextCursorPosition(editor.topLevelBlocks.slice(-1)[0], 'end')
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
              icon={RiFile2Line}
              theme="gray"
              borderRadius={0}
              size="$5"
              justifyContent="flex-start"
            >
              Add a File
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
              </Tabs.List>

              <Tabs.Content value="upload">
                <XStack
                  padding="$4"
                  alignItems="center"
                  backgroundColor="white"
                >
                  <XStack
                    flex={1}
                    backgroundColor={drag ? 'lightgrey' : 'white'}
                    // @ts-ignore
                    onDrop={(e: React.DragEvent<HTMLDivElement>) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (drag) setDrag(false)
                      if (
                        e.dataTransfer.files &&
                        e.dataTransfer.files.length > 0
                      ) {
                        const files = Array.from(e.dataTransfer.files)
                        handleUpload(Array.from(files))
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
                      borderColor="lightgrey"
                      borderWidth="$0.5"
                      borderRadius="$3"
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
            </Tabs>
          </Popover.Content>
        </Popover>
      </YStack>
    </div>
  )
}

export const insertFile = new ReactSlashMenuItem<HDBlockSchema>(
  'File',
  (editor: BlockNoteEditor<HDBlockSchema>) => {
    insertOrUpdateBlock(editor, {
      type: 'file',
      props: {
        url: '',
      },
    })
  },
  ['file', 'folder'],
  'Media',
  <RiFile2Line size={18} />,
  'Insert a file',
)

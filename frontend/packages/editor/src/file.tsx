import {useAppContext} from '@mintter/app/app-context'
import {toast} from '@mintter/app/toast'
import {BACKEND_FILE_UPLOAD_URL, formatBytes} from '@mintter/shared'
import {
  Button,
  File,
  Label,
  Popover,
  SizableText,
  Tabs,
  XStack,
  YStack,
  useTheme,
} from '@mintter/ui'
import {ChangeEvent, useEffect, useState} from 'react'
import {
  Block,
  BlockNoteEditor,
  defaultProps,
  getBlockInfoFromPos,
} from './blocknote/core'
import {createReactBlockSpec} from './blocknote/react'
import {HMBlockSchema} from './schema'

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
    block: Block<HMBlockSchema>
    editor: BlockNoteEditor<HMBlockSchema>
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

  const assignFile = (newFile: FileType) => {
    editor.updateBlock(block.id, {
      props: {...block.props, ...newFile.props},
    })
    editor.setTextCursorPosition(block.id, 'end')
  }

  const setSelection = (isSelected: boolean) => {
    setSelected(isSelected)
  }

  return (
    <YStack
      backgroundColor={selected ? '$color4' : '$color3'}
      borderColor={selected ? '$color8' : 'transparent'}
      borderWidth={2}
      borderRadius="$4"
      overflow="hidden"
      hoverStyle={{
        backgroundColor: '$color4',
      }}
    >
      {block.props.url ? (
        <FileComponent
          block={block}
          editor={editor}
          assign={assignFile}
          selected
          setSelected={setSelection}
        />
      ) : editor.isEditable ? (
        <FileForm block={block} assign={assignFile} editor={editor} />
      ) : (
        <></>
      )}
    </YStack>
  )
}

export async function handleDragReplace(file: File) {
  if (file.size > 62914560) {
    toast.error(`The size of ${file.name} exceeds 60 MB.`)
    return null
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await fetch(BACKEND_FILE_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    })
    const data = await response.text()
    return {
      url: data ? `ipfs://${data}` : '',
      name: file.name,
      size: file.size.toString(),
    } as FileType['props']
  } catch (error) {
    console.error(error)
  }
}

export function FileComponent({
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
  const {saveCidAsFile} = useAppContext()

  const saveFile = async () => {
    await saveCidAsFile(block.props.url, block.props.name)
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
          const files = Array.from(e.dataTransfer.files)
          const file = files[0]
          if (!file) return

          handleDragReplace(file)
            .then((newProps) => {
              assign({
                props: newProps,
              })
              editor.setTextCursorPosition(
                editor.topLevelBlocks.slice(-1)[0],
                'end',
              )
            })
            .catch((e) => {
              toast.error('Something went wrong adding this file')
              console.error(e)
            })
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
                  size: '0',
                },
                children: [],
                content: [],
                type: 'file',
              } as FileType)
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
            onPress={saveFile}
            hoverStyle={{
              backgroundColor: '$backgroundTransparent',
            }}
          >
            save
          </Button>
        )
      ) : null}
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
          maxWidth="17em"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          userSelect="text"
        >
          {block.props.name}
        </SizableText>
        <SizableText
          paddingTop="$1"
          color="$color10"
          size="$2"
          minWidth="4.5em"
        >
          {formatBytes(parseInt(block.props.size))}
        </SizableText>
      </Button>
    </YStack>
  )
}

function FileForm({
  block,
  assign,
  editor,
}: {
  block: Block<HMBlockSchema>
  assign: any
  editor: BlockNoteEditor<HMBlockSchema>
}) {
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
        props: {
          url: data ? `ipfs://${data}` : '',
          name: name,
          size: files[0].size.toString(),
        },
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
          props: {
            url: data ? `ipfs://${data}` : '',
            name: name,
            size: files[0].size.toString(),
          },
        } as FileType)
      } catch (error) {
        console.error(error)
      }
    }
    editor.setTextCursorPosition(editor.topLevelBlocks.slice(-1)[0], 'end')
  }

  return (
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
            icon={<File />}
            borderRadius={0}
            size="$5"
            justifyContent="flex-start"
            backgroundColor="$color3"
            hoverStyle={{
              backgroundColor: '$color4',
            }}
          >
            Add a File
          </Button>
        </Popover.Trigger>
        <Popover.Content
          padding={0}
          elevation="$4"
          overflow="hidden"
          size="$5"
          borderRadius="$5"
          // shadowColor="$shadowColor"
          opacity={1}
          enterStyle={{x: 0, y: -20, opacity: 0}}
          exitStyle={{x: 0, y: -20, opacity: 0}}
          y={-10}
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
            width={500}
            elevate
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
                  backgroundColor: '$backgroundHover',
                  cursor: 'pointer',
                }}
              >
                <SizableText size="$2">Upload</SizableText>
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
                    borderColor="$color8"
                    borderWidth="$0.5"
                    borderRadius="$4"
                    width={500}
                    justifyContent="center"
                    backgroundColor={drag ? '$borderColorHover' : '$background'}
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
  )
}

// export const insertFile = new ReactSlashMenuItem<HMBlockSchema>(
//   'File',
//   (editor: BlockNoteEditor<HMBlockSchema>) => {
//     insertOrUpdateBlock(editor, {
//       type: 'file',
//       props: {
//         url: '',
//       },
//     })
//   },
//   ['file', 'folder'],
//   'Media',
//   <RiFile2Fill size={18} />,
//   'Insert a file',
// )
